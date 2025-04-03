// Shared Commodore 8-bit machine stuff

import {Detail} from "../../ui/Detail.ts";
import {
  ActionFunction,
  hexDumper,
  LogicalLine,
  Tag,
  TAG_ADDRESS,
  TAG_ENTRY_POINT,
  TAG_EXECUTED,
  TAG_HEX,
  TAG_LINE,
  UserAction
} from "../api.ts";
import {Environment, SymbolType,} from "../asm/asm.ts";
import {DefaultDialect} from "../asm/DefaultDialect.ts";
import {Disassembler} from "../asm/Disassembler.ts";
import {DisassemblyMeta} from "../asm/DisassemblyMeta.ts";
import {Directive, InstructionLike, PcAssign, SymbolDefinition, SymDef} from "../asm/instructions.ts";
import {BlobSniffer} from "../BlobSniffer.ts";
import {BlobTypeSniffer} from "../BlobTypeSniffer.ts";
import {Addr, asHex, hex16, hex8} from "../core.ts";
import {DataViewImpl} from "../DataView.ts";
import {FileBlob} from "../FileBlob.ts";
import {ArrayMemory} from "../Memory.ts";
import {Mos6502} from "../mos6502.ts";
import {InstRec, Tracer} from "../Tracer.ts";
import {CBM_BASIC_2_0} from "./BasicDecoder.ts";

/**
 * The expected file extensions for Commodore machines. May need to add more but these seem initially sufficient
 */
const fileTypes = ["prg", "crt", "bin", "d64", "tap", "t64", "rom", "d71", "d81", "p00", "sid", "bas"];

function disassembleActual(fb: FileBlob, dialect: DefaultDialect, meta: DisassemblyMeta) {
  const dis = new Disassembler(Mos6502.ISA, fb, meta);
  const detail = new Detail("Disassembly", [TAG_LINE], new DataViewImpl([]))

  // do trace to decide which is code
  const traceResult: TraceResult = trace(dis, fb, meta);

  // start timer
  const startTime = Date.now();
  // console.log(`kernal symbols used: ${traceResult.kernalSymbolsUsed.length}`);
  // add the kernal symbol definitions first
  traceResult.kernalSymbolsUsed.forEach(symbol => {
    const symbolDefinition = new SymbolDefinition(symbol);
    detail.dataView.addLine(new LogicalLine(symbolDefinition.disassemble(dialect, dis), 0, undefined))
  });

  // set the base address with a directive
  const assignPc: Directive = new PcAssign(dis.currentAddress, ["base"], ["load address"]);
  const tagSeq = assignPc.disassemble(dialect, dis);
  // this line corresponds to zero bytes
  detail.dataView.addLine(new LogicalLine(tagSeq, 0, dis.currentAddress));
  // TODO this is where we must change to code path disassembly order
  while (dis.hasNext()) {
    const instAddress = dis.currentAddress;
    let inst: InstructionLike | undefined = dis.nextInstructionLine();
    if (!inst) {
      // TODO decide how this can happen and what to do instead (byte declaration?)
      throw Error(`cannot disassemble at ${instAddress}`);
    } else {
      const addressTags = [TAG_ADDRESS];
      if (traceResult.codeAddresses.includes(instAddress)) {
        addressTags.push(TAG_EXECUTED);
      }
      if (meta.executionEntryPoints(fb).map(as => as[0]).includes(instAddress)) {
        addressTags.push(TAG_ENTRY_POINT);
      }
      const tags = [
        new Tag(addressTags, hex16(instAddress)),
        new Tag([TAG_HEX], asHex(inst.getBytes())),
        ...inst.disassemble(dialect, dis)
      ];
      detail.dataView.addLine(new LogicalLine(tags, inst.getLength(), instAddress, inst));
    }
  }

  // TODO link up internal address references jump targets with synthetic label names
  const stats = dis.getStats();
  // for now assuming there's no doubling up of stats keys
  stats.forEach((v, k) => detail.stats.push([k, v.toString()]));
  detail.stats.push(["tracer", `${traceResult.steps} steps, ${traceResult.traceTime} ms (${traceResult.endState})`]);

  detail.stats.push(["assembly lines", detail.dataView.getLines().length.toString()]);
  const timeTaken = Date.now() - startTime;
  detail.stats.push(["disassembled in", `${timeTaken}  ms`]);
  // TODO introduce detail having options as well as stats; dialect should be an option
  detail.stats.push(["dialect", dialect.name]);
  detail.stats.push(["dialect info", dialect.description]);
  return detail;
}

type TraceResult = {
  codeAddresses: Addr[],
  traceTime: number,
  endState: string,
  steps: number,
  kernalSymbolsUsed: SymDef<Addr>[],
  executedInstructions: InstRec[]
}


/**
 * Does full trace
 * @param dis
 * @param fb
 * @param meta
 * @return tuple of array of executed addresses and the number of milliseconds taken to trace
 */
function trace(dis: Disassembler, fb: FileBlob, meta: DisassemblyMeta): TraceResult {
  const LE_64K = ArrayMemory.zeroes(0x10000, Mos6502.ENDIANNESS, true, true);
  // TODO load system rom into memory instead of ignoring
  const symbolTable = meta.getSymbolTable();
  const isKernalSubroutine = (addr: Addr) => SymbolType.sub === symbolTable.byValue(addr)?.sType;
  const entryPoints = meta.executionEntryPoints(fb);

  const tracer = new Tracer(dis, entryPoints, LE_64K, isKernalSubroutine);
  const traceStart = Date.now();
  const stepsTaken = tracer.trace(10000);
  const endMessage = tracer.running() ? "did not terminate" : "completed";
  const traceTime = Date.now() - traceStart;
  const executedInstructions = tracer.executedInstructions();
  const codeAddresses = [...tracer.executedAddresses()].sort();

  const kernalSymbolsUsed: Set<SymDef<number>> = new Set<SymDef<number>>();
  executedInstructions.forEach(ir => {
    // get the address of the operand and figure out if it is a symbol needing a definition
    const instruction = ir[1];
    // does instruction have an operand?
    if (instruction.getLength() > 1) {
      // can we resolve the operand?
      const gotOperand = instruction.staticallyResolvableOperand();
      if (gotOperand) {
        const operandValue = instruction.operandValue();
        const symDef = symbolTable.byValue(operandValue);
        if (operandValue && symDef) {
          kernalSymbolsUsed.add(symDef);
        }
      } else {
        // we cannot statically resolve this operand so it's not usd to build kernal symbols
        //console.warn(`no operand for ${instruction.instruction.op.mnemonic} instruction at ${addr} ${hex16(addr)}`);
      }
    }
  });

  return {
    codeAddresses: codeAddresses,
    kernalSymbolsUsed: Array.from(kernalSymbolsUsed),
    executedInstructions: executedInstructions,
    traceTime: traceTime,
    endState: endMessage,
    steps: stepsTaken
  };
}

/**
 * User action that disassembles the file.
 */
export const disassemble: ActionFunction = (t: BlobSniffer, fb: FileBlob) => {
  const dialect = new DefaultDialect(Environment.DEFAULT_ENV);  // to be made configurable later
  let userActions: [UserAction, ...UserAction[]] = [{
    label: "disassembly",
    f: async () => {
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
      f: async () => {
        const cbmFb = fb.asEndian(); // TODO scary this shouldn't work with a better type system
        const detail = new Detail("CBM Basic", ["basic"], CBM_BASIC_2_0.decode(cbmFb));
        // exclude "note" tags which are not a "line"
        const justLines = (ll: LogicalLine) => ll.getTags().find((t: Tag) => t.isLine()) !== undefined;
        detail.stats.push(["lines", detail.dataView.getLines().filter(justLines).length.toString()]);
        return detail;
      }
    }]
  };
};

/**
 * Makes a BlobType representing a 6502 Commodore program binary file format with
 * the first two bytes of the load address in LSB,MSB format (little endian).
 *
 * @param prefix either an array of prefix bytes or a 16 bit word
 */
function prg(prefix: ArrayLike<number> | number) {
  // prg has a two byte load address
  const prefixPair = (typeof prefix === "number") ? Mos6502.ENDIANNESS.wordToTwoBytes(prefix) : prefix;
  let addr: string = `${hex8(prefixPair[1])}${hex8(prefixPair[0])}`; // little-endian rendition
  const desc = `program binary to load at $${addr}`;
  return new BlobTypeSniffer(`prg@${addr}`, desc, ["prg"], "prg", prefixPair);
}

/**
 * Detects raw cartridge ROM dumps. Currently very VIC-20-biased.
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

export {CartSniffer, prg, printBasic, fileTypes, trace};
