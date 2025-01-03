// Shared Commodore 8-bit machine stuff

import {
  ActionFunction,
  Detail,
  hexDumper,
  LogicalLine,
  Tag,
  TAG_ADDRESS,
  TAG_HEX,
  TAG_LINE,
  UserAction
} from "../api.ts";
import {Environment,} from "../asm/asm.ts";
import {CBM_BASIC_2_0} from "./basic.ts";
import {asHex, hex16, hex8} from "../core.ts";
import {FileBlob} from "../FileBlob.ts";
import {Mos6502} from "../mos6502.ts";
import {DataViewImpl} from "../DataView.ts";
import {BlobSniffer} from "../BlobSniffer.ts";
import {DefaultDialect} from "../asm/DefaultDialect.ts";
import {Disassembler} from "../asm/Disassembler.ts";
import {Directive, InstructionLike, PcAssign} from "../asm/instructions.ts";
import {BlobType} from "../BlobType.ts";
import {DisassemblyMeta} from "../asm/DisassemblyMeta.ts";

/**
 * The expected file extensions for Commodore machines. May need to add more but these seem initially sufficient
 */
const fileTypes = ["prg", "crt", "bin", "d64", "tap", "t64", "rom", "d71", "d81", "p00", "sid", "bas"];

function disassembleActual(fb: FileBlob, dialect: DefaultDialect, meta1: DisassemblyMeta) {
  // start timer
  const startTime = Date.now();

  const meta = meta1;

  const dis = new Disassembler(Mos6502.ISA, fb, meta);
  const detail = new Detail("Disassembly", [TAG_LINE], new DataViewImpl([]))

  // set the base address with a directive
  const assignPc: Directive = new PcAssign(dis.currentAddress, ["base"], []);
  const tagSeq = assignPc.disassemble(dialect, dis);

  detail.dataView.addLine(new LogicalLine(tagSeq, dis.currentAddress));
  while (dis.hasNext()) {
    const instAddress = dis.currentAddress; // save current address before we increment it
    let inst: InstructionLike = dis.nextInstructionLine();
    const tags = [
      new Tag(TAG_ADDRESS, hex16(instAddress)),
      new Tag(TAG_HEX, asHex(inst.getBytes())),
      ...inst.disassemble(dialect, dis)
    ];
    detail.dataView.addLine(new LogicalLine(tags, instAddress, inst));
  }
  // TODO link up internal address references including jump targets and mark two-sided cross-references
  const stats = dis.getStats();
  // for now assuming there's no doubling up of stats keys
  stats.forEach((v, k) => detail.stats.push([k, v.toString()]));

  detail.stats.push(["lines", detail.dataView.getLines().length.toString()]);
  const timeTaken = Date.now() - startTime;
  detail.stats.push(["disassembled in", `${timeTaken}  ms`]);
  detail.stats.push(["dialect", dialect.name]);
  return detail;
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

  sniff(fb: FileBlob): number {
    return fb.submatch(this.magic, this.magicOffset) ? 3 : 0.3;
  }

  getMeta(): DisassemblyMeta {
    return this.disassemblyMeta;
  }
}

export {CartSniffer, prg, printBasic, fileTypes};
