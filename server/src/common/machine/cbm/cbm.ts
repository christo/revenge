// Shared Commodore 8-bit machine stuff

import {DataViewImpl} from "../../DataView.js";
import {Detail} from "../../Detail.js";
import {Directive} from "../asm/Directive.js";
import {Disassembler} from "../asm/Disassembler.js";
import {DisassemblyMeta} from "../asm/DisassemblyMeta.js";
import {BLANK_LINE, InstructionLike, PcAssign, SymbolDefinition, SymDef} from "../asm/instructions.js";
import {RevengeDialect} from "../asm/RevengeDialect.js";
import {SymbolType} from "../asm/SymbolTable.js";
import {BlobSniffer, Stench} from "../BlobSniffer.js";
import {BlobTypeSniffer} from "../BlobTypeSniffer.js";
import {Addr, asHex, hex16, hex8} from "../core.js";
import {FileBlob} from "../FileBlob.js";
import {LogicalLine} from "../LogicalLine.js";
import {ArrayMemory} from "../Memory.js";
import {Mos6502} from "../mos6502.js";
import {InstRec, Tracer} from "../sim/Tracer.js";
import {
  Tag,
  TAG_ADDRESS,
  TAG_ADDRESS_WAS_READ,
  TAG_ADDRESS_WAS_WRITTEN,
  TAG_ENTRY_POINT,
  TAG_EXECUTED,
  TAG_HEX,
  TAG_LINE
} from "../Tag.js";
import {C64_BASIC_PRG} from "./c64.js";
import {EXP03K_VIC_BASIC, EXP08K_VIC_BASIC, EXP16K_VIC_BASIC, EXP24K_VIC_BASIC, UNEXPANDED_VIC_BASIC} from "./vic20.js";

// TODO merge these with the bigger list in common/analysis...
const PROGRAM_EXTS = ["prg", "crt", "bin", "rom", "p00", "bas"];
const VOLUME_EXTS = ["d64", "tap", "t64", "d71", "d81"];
const MEDIA_EXTS = ["sid"];

/**
 * The expected file extensions for Commodore machines. May need to add more, but these seem initially sufficient
 */
const ALL_CBM_FILE_EXTS = [...PROGRAM_EXTS, ...VOLUME_EXTS, ...MEDIA_EXTS];


/**
 * Call the Disassembler for 6502 instruction set.
 *
 * @param fb binary to disassemble
 * @param dialect decides the output syntax
 * @param meta metadata about the disassembly context
 */
function disassembleActual(fb: FileBlob, dialect: RevengeDialect, meta: DisassemblyMeta): Detail {
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

  // trying out this idea, looks a little noisy still
  detail.dataView.addLine(new LogicalLine(BLANK_LINE.disassemble(dialect, dis), 0, undefined));

  // set the base address with a directive
  const assignPc: Directive = new PcAssign(dis.currentAddress, ["base"], ["load address"]);
  // this line corresponds to zero bytes
  detail.dataView.addLine(new LogicalLine(assignPc.disassemble(dialect, dis), 0, dis.currentAddress));
  // TODO this is where we must change to code path disassembly order
  while (dis.hasNext()) {
    const instAddress = dis.currentAddress;
    const inst: InstructionLike = dis.nextInstructionLine();
    const addressTags = [TAG_ADDRESS];
    if (traceResult.codeAddresses.includes(instAddress)) {
      addressTags.push(TAG_EXECUTED);
    }
    if (traceResult.writtenAddresses.includes(instAddress)) {
      addressTags.push(TAG_ADDRESS_WAS_WRITTEN);
    }
    if (traceResult.readAddresses.includes(instAddress)) {
      addressTags.push(TAG_ADDRESS_WAS_READ);
    }
    if (meta.executionEntryPoints(fb).map(as => as.index).includes(instAddress)) {
      addressTags.push(TAG_ENTRY_POINT);
    }
    const tags = [
      new Tag(addressTags, hex16(instAddress)),
      new Tag([TAG_HEX], asHex(inst.getBytes())),
      ...inst.disassemble(dialect, dis)
    ];
    detail.dataView.addLine(new LogicalLine(tags, inst.getLength(), instAddress, inst));
  }

  // TODO link up internal address references jump targets with synthetic label names
  const stats = dis.getStats();
  // for now assuming there's no doubling up of stats keys
  stats.forEach((v, k) => detail.stats.push([k, v.toString()]));
  detail.stats.push(["exec trace", `${traceResult.steps} steps, ${traceResult.traceTime} ms (${traceResult.endState})`]);
  const readsInBinary = traceResult.readAddresses.filter(a => meta.isInBinary(a, fb));
  const writesInBinary = traceResult.writtenAddresses.filter(a => meta.isInBinary(a, fb));
  detail.stats.push(["static memory reads", `${traceResult.readAddresses.length} (${readsInBinary.length} in binary)`]);
  detail.stats.push(["static memory writes", `${traceResult.writtenAddresses.length} (${writesInBinary.length} in binary)`]);

  detail.stats.push(["assembly lines", detail.dataView.getLines().length.toString()]);
  const timeTaken = Date.now() - startTime;
  detail.stats.push(["disassembled in", `${timeTaken}  ms`]);
  // TODO introduce detail having options as well as stats; dialect should be an option
  //  note that options should be able to have sub-options or dependent options
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
  executedInstructions: InstRec[],
  writtenAddresses: Addr[],
  readAddresses: Addr[],
}


/**
 * Does full trace
 * @param dis
 * @param fb
 * @param meta
 * @return tuple of array of executed addresses and the number of milliseconds taken to trace
 */
function trace(dis: Disassembler, fb: FileBlob, meta: DisassemblyMeta): TraceResult {
  // fill with zeroes because they are break on 6502
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
  const writtenAddresses = tracer.getWritten();
  const readAddresses = tracer.getRead();
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
        // we cannot statically resolve this operand, we don't use it to build kernal symbols
        //console.warn(`no operand for ${instruction.instruction.op.mnemonic} instruction at ${addr} ${hex16(addr)}`);
      }
    }
  });

  return {
    codeAddresses: codeAddresses,
    kernalSymbolsUsed: Array.from(kernalSymbolsUsed),
    executedInstructions: executedInstructions,
    writtenAddresses: writtenAddresses,
    readAddresses: readAddresses,
    traceTime: traceTime,
    endState: endMessage,
    steps: stepsTaken
  };
}

/**
 * Makes a BlobTypeSniffer representing a 6502 Commodore program binary file format with
 * the first two bytes of the load address in LSB,MSB format (little endian).
 *
 * @param prefix either an array of prefix bytes or a 16 bit word
 */
function prg(prefix: ArrayLike<number> | number) {
  // prg has a two byte load address
  const prefixPair = (typeof prefix === "number") ? Mos6502.ENDIANNESS.wordToTwoBytes(prefix) : prefix;
  const addr: string = `${hex8(prefixPair[1])}${hex8(prefixPair[0])}`; // little-endian rendition
  const desc = `program binary to load at $${addr}`;
  return new BlobTypeSniffer(`prg@${addr}`, desc, ["prg"], "prg", prefixPair);
}

/**
 * Detects raw cartridge ROM dumps. Currently very VIC-20-biased.
 */
class CartSniffer implements BlobSniffer {

  readonly name: string;
  readonly desc: string;
  readonly hashTags: string[];
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
    this.hashTags = tags;
    this.magic = new Uint8Array(magic);
    this.magicOffset = offset;
    this.disassemblyMeta = dm;
  }

  /**
   * If we match the magic number at the start of the file it's a pretty strong
   * signal that this is a cart.
   * @param fb fileblob to check for being a cart
   */
  sniff(fb: FileBlob): Stench {
    return {score: fb.submatch(this.magic, this.magicOffset) ? 3 : 0.3, messages: []};
  }

  getMeta(): DisassemblyMeta {
    return this.disassemblyMeta;
  }
}

export {CartSniffer, prg, ALL_CBM_FILE_EXTS, trace, disassembleActual};

// Make these decode the basic and do a few sanity checks, e.g. monotonic unique line numbers
export const BASIC_SNIFFERS: BlobSniffer[] = [
  UNEXPANDED_VIC_BASIC,
  EXP03K_VIC_BASIC,
  EXP08K_VIC_BASIC,
  EXP16K_VIC_BASIC,
  EXP24K_VIC_BASIC,
  C64_BASIC_PRG,
];