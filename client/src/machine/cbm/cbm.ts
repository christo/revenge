// Shared Commodore 8-bit machine stuff

import {Detail} from "../../ui/Detail.ts";
import {
  ActionFunction,
  hexDumper,
  LogicalLine,
  Tag,
  TAG_ADDRESS,
  TAG_EXECUTED,
  TAG_HEX,
  TAG_LINE,
  UserAction
} from "../api.ts";
import {Environment, SymbolType,} from "../asm/asm.ts";
import {DefaultDialect} from "../asm/DefaultDialect.ts";
import {Disassembler} from "../asm/Disassembler.ts";
import {DisassemblyMeta} from "../asm/DisassemblyMeta.ts";
import {Directive, InstructionLike, PcAssign} from "../asm/instructions.ts";
import {BlobSniffer} from "../BlobSniffer.ts";
import {BlobType} from "../BlobType.ts";
import {Addr, asHex, hex16, hex8, LE} from "../core.ts";
import {DataViewImpl} from "../DataView.ts";
import {FileBlob} from "../FileBlob.ts";
import {ArrayMemory} from "../Memory.ts";
import {Mos6502} from "../mos6502.ts";
import {Tracer} from "../Tracer.ts";
import {CBM_BASIC_2_0} from "./BasicDecoder.ts";

/**
 * The expected file extensions for Commodore machines. May need to add more but these seem initially sufficient
 */
const fileTypes = ["prg", "crt", "bin", "d64", "tap", "t64", "rom", "d71", "d81", "p00", "sid", "bas"];

function disassembleActual(fb: FileBlob, dialect: DefaultDialect, meta: DisassemblyMeta) {

  // start timer
  const startTime = Date.now();

  const dis = new Disassembler(Mos6502.ISA, fb, meta);
  const detail = new Detail("Disassembly", [TAG_LINE], new DataViewImpl([]))

  // set the base address with a directive
  const assignPc: Directive = new PcAssign(dis.currentAddress, ["base"], []);
  const tagSeq = assignPc.disassemble(dialect, dis);

  // do trace to decide which is code
  const traceResult: TraceResult = trace(dis, fb, meta);
  // TODO meta shouldn't hold this state
  meta.addCodeAddresses(traceResult.codeAddresses);

  detail.dataView.addLine(new LogicalLine(tagSeq, dis.currentAddress));
  while (dis.hasNext()) {
    const instAddress = dis.currentAddress; // save current address before we increment it
    let inst: InstructionLike = dis.nextInstructionLine();
    const addressTags = [TAG_ADDRESS];
    if (traceResult.codeAddresses.includes(instAddress)) {
      addressTags.push(TAG_EXECUTED);
    }
    const tags = [
      new Tag(addressTags, hex16(instAddress)),
      new Tag([TAG_HEX], asHex(inst.getBytes())),
      ...inst.disassemble(dialect, dis)
    ];
    detail.dataView.addLine(new LogicalLine(tags, instAddress, inst));
  }

  // TODO link up internal address references including jump targets and mark two-sided cross-references
  const stats = dis.getStats();
  // for now assuming there's no doubling up of stats keys
  stats.forEach((v, k) => detail.stats.push([k, v.toString()]));
  detail.stats.push(["tracer", `${traceResult.steps} steps, ${traceResult.traceTime} ms (${traceResult.endState})`]);

  detail.stats.push(["assembly lines", detail.dataView.getLines().length.toString()]);
  const timeTaken = Date.now() - startTime;
  detail.stats.push(["disassembled in", `${timeTaken}  ms`]);
  detail.stats.push(["dialect", dialect.name]);
  return detail;
}

type TraceResult = {
  codeAddresses: Addr[],
  traceTime: number,
  endState: string,
  steps: number,
}


/**
 * Does full trace
 * @param dis
 * @param fb
 * @param meta
 * @return tuple of array of executed addresses and the number of milliseconds taken to trace
 */
function trace(dis: Disassembler, fb: FileBlob, meta: DisassemblyMeta): TraceResult {
  const LE_64K = ArrayMemory.zeroes(0x10000, LE, true, true);
  // TODO load system rom into memory
  const ignoreKernalSubroutines = (addr: Addr) => SymbolType.sub === meta.getSymbolTable().byAddress(addr)?.sType;
  const tracer = new Tracer(dis, meta.executionEntryPoint(fb), LE_64K, ignoreKernalSubroutines);
  const traceStart = Date.now();
  // TODO max steps is half-arsed attempt to discover why this call locks up
  const stepsTaken = tracer.trace(10000);
  const endMessage = tracer.running() ? "did not terminate" : "terminated";
  const traceTime = Date.now() - traceStart;
  const codeAddresses = [...tracer.executed()].sort();
  return {
    codeAddresses: codeAddresses,
    traceTime: traceTime,
    endState: endMessage,
    steps: stepsTaken
  };
}

/** User action that disassembles the file. */
export const disassemble: ActionFunction = (t: BlobSniffer, fb: FileBlob) => {
  const dialect = new DefaultDialect(Environment.DEFAULT_ENV);  // to be made configurable later
  let userActions: [UserAction, ...UserAction[]] = [{
    label: "disassembly",
    f: () => {
      return disassembleActual(fb, dialect, t.getMeta());
    }
  }, hexDumper(fb)];
  return {
    t: t,
    actions: userActions
  };
};

/** Prints the file as a BASIC program. */
const printBasic: ActionFunction = (t: BlobSniffer, fb: FileBlob) => {
  return {
    t: t,
    actions: [{
      label: "basic",
      f: () => {
        const detail = new Detail("CBM Basic", ["basic"], CBM_BASIC_2_0.decode(fb));
        // exclude "note" tags which are not a "line"
        const justLines = (ll: LogicalLine) => ll.getTags().find((t: Tag) => t.hasTag(TAG_LINE)) !== undefined;
        detail.stats.push(["lines", detail.dataView.getLines().filter(justLines).length.toString()]);
        return detail;
      }
    }]
  };
};

/**
 * PRG refers to the Commodore program binary file format which merely prefixes the content with the load address.
 *
 * @param prefix
 */
function prg(prefix: ArrayLike<number>) {
  // prg has a two byte load address
  const addr = hex8(prefix[1]) + hex8(prefix[0]); // little-endian rendition
  return new BlobType("prg@" + addr, "program binary to load at $" + addr, ["prg"], "prg", prefix);
}

/**
 * Cart ROM dumps without any emulator metadata file format stuff.
 * Currently very VIC-20-biased.
 */
class CartSniffer implements BlobSniffer {

  readonly name: string;
  readonly desc: string;
  readonly tags: string[];
  private readonly magic: Uint8Array;
  private readonly magicOffset: number;
  private readonly disassemblyMeta: DisassemblyMeta;

  /**
   * Carts images have a fixed, magic signature of bytes at a known offset.
   *
   * @param name name of the file type
   * @param desc description
   * @param tags hashtags
   * @param magic the magic sequence.
   * @param offset where the magic happens.
   * @param dm describes the disassembly stuff
   */
  constructor(name: string, desc: string, tags: string[], magic: ArrayLike<number>, offset: number, dm: DisassemblyMeta) {
    this.name = name;
    this.desc = desc;
    this.tags = tags;
    this.magic = new Uint8Array(magic);
    this.magicOffset = offset;
    this.disassemblyMeta = dm;
  }

  /**
   * If we match the magic number at the start of the file it's a pretty strong
   * signal that this is a cart.
   * @param fb fileblob to check for being a cart
   */
  sniff(fb: FileBlob): number {
    return fb.submatch(this.magic, this.magicOffset) ? 3 : 0.3;
  }

  getMeta(): DisassemblyMeta {
    return this.disassemblyMeta;
  }
}

export {CartSniffer, prg, printBasic, fileTypes};
