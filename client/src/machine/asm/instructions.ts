import {Tag} from "../api.ts";
import {Byteable} from "../Byteable.ts";
import {assertByte} from "../core.ts";
import {FileBlob} from "../FileBlob.ts";
import {FullInstruction} from "../mos6502.ts";
import {LabelsComments, SourceType, SymbolType} from "./asm.ts";
import {Assembler} from "./Assembler.ts";
import {Dialect} from "./Dialect.ts";
import {Disassembler} from "./Disassembler.ts";
import {Edict} from "./Edict.ts";

/** Convenience base class implementing comment and label properties. */
export abstract class InstructionBase implements InstructionLike {
  protected _lc: LabelsComments;
  private readonly _sourceType: SourceType;

  protected constructor(lc: LabelsComments, st: SourceType) {
    this._lc = lc;
    this._sourceType = st;
  }

  get labelsComments(): LabelsComments {
    return this._lc;
  }

  get sourceType(): SourceType {
    return this._sourceType;
  }

  read8 = (offset: number): number => this.getBytes()[offset];

  abstract disassemble(dialect: Dialect, dis: Disassembler): Tag[];

  abstract getBytes(): number[];

  abstract getLength(): number;
}

/**
 * Assembler directive. Has a source form, may produce bytes during assembly and may be synthesised during
 * disassembly, but does not necessarily correspond to machine instructions and may not even produce code output.
 */
interface Directive extends InstructionLike {

  isSymbolDefinition(): boolean;

  isMacroDefinition(): boolean;

  isPragma(): boolean;
}

/**
 * Assembly directive representing setting the program counter.
 * Often represented like this: 'org = $f000' or '* = $f000'
 */
class PcAssign extends InstructionBase implements Directive {
  private readonly _address: number;

  constructor(address: number, labels: string[] = [], comments: string[] = []) {
    super(new LabelsComments(labels, comments), SourceType.PSEUDO);
    this._address = address;
  }

  get address(): number {
    return this._address;
  }

  isMacroDefinition(): boolean {
    return false;
  }

  isPragma(): boolean {
    return false;
  }

  isSymbolDefinition(): boolean {
    return true;
  }

  assemble(_dialect: Dialect, ass: Assembler): number[] {
    ass.setCurrentAddress(this._address);
    return this.getBytes();
  }

  disassemble = (dialect: Dialect, dis: Disassembler): Tag[] => dialect.pcAssign(this, dis);

  getBytes = (): number[] => [];

  getLength = (): number => 0;
}

/** Assembler pseudo-op that reserves literal bytes. */
export class ByteDeclaration extends InstructionBase implements Directive, Byteable {

  private readonly _rawBytes: Array<number>;

  constructor(rawBytes: number[], lc: LabelsComments) {
    super(lc, SourceType.DATA);
    this._rawBytes = rawBytes.map(b => assertByte(b));
  }

  isMacroDefinition(): boolean {
    return false;
  }

  isPragma(): boolean {
    return false;
  }

  isSymbolDefinition(): boolean {
    return false;
  }

  getBytes = (): number[] => this._rawBytes;
  getLength = (): number => this._rawBytes.length;

  disassemble = (dialect: Dialect, dis: Disassembler): Tag[] => dialect.bytes(this, dis);
}

/**
 * 16-bit word definition in architecture endianness. Currently only little-endian architectures supported.
 */
class WordDefinition extends InstructionBase implements Directive {
  private readonly value: number;
  private readonly bytes: number[];

  /**
   * Use stream order of bytes, lsb and msb is determined by endianness inside this implementation.
   *
   * @param firstByte first byte in the stream.
   * @param secondByte second byte in the stream.
   * @param lc for the humans.
   */
  constructor(firstByte: number, secondByte: number, lc: LabelsComments) {
    super(lc, SourceType.DATA);
    this.value = (secondByte << 8) | firstByte;
    this.bytes = [firstByte, secondByte];
  }

  isMacroDefinition(): boolean {
    return false;
  }

  isPragma(): boolean {
    return false;
  }

  isSymbolDefinition(): boolean {
    return false;
  }

  disassemble = (dialect: Dialect, dis: Disassembler): Tag[] => dialect.words([this.value], this._lc, dis);
  getBytes = (): number[] => this.bytes;
  getLength = (): number => 2;
}

/**
 * Syntax-independent form for any assemblable and disassemblable element, implementations include machine instructions
 * and assembler directives. The {@link Assembler} and {@link Disassembler} hold state for a sequence of such items
 * during the assembly or disassembly and the {@link Dialect} performs syntax-specific source text parsing and
 * unparsing. This decomposition supports program transformation workflows such as syntax translation and peephole
 * optimisation.
 */
interface InstructionLike extends Byteable {

  get labelsComments(): LabelsComments;

  /**
   * Disassembles the implementation's instruction with the given stateful disassembler, in the given dialect.
   *
   * @param dialect the syntax-specifics for disassembly.
   * @param dis the stateful disassembler.
   */
  disassemble(dialect: Dialect, dis: Disassembler): Tag[];

  /**
   * Return the {@link SourceType} for the generated code (regardless of comments).
   */
  get sourceType(): SourceType;
}

/**
 * A line containing no comment, label, directive or instruction. It may contain whitespace
 * or any other content ignored in the dialect.
 */
const BLANK_LINE: InstructionLike = {

  disassemble: (_dialect: Dialect, _dis: Disassembler): Tag[] => [],

  getBytes: (): number[] => [],

  getLength: (): number => 0,

  read8: (_offset: number): number => {
    throw Error("no bytes to read");
  },

  get labelsComments(): LabelsComments {
    return LabelsComments.EMPTY;
  },

  get sourceType(): SourceType {
    return SourceType.BLANK;
  },
}

/**
 * A representation of a specific instruction on a line in a source file with its
 * operands, potential labels, potential comments etc.
 */
class FullInstructionLine extends InstructionBase {
  private readonly _fullInstruction: FullInstruction;

  constructor(fullInstruction: FullInstruction, lc: LabelsComments) {
    // this is not quite right because this is a composite that includes labels and comments
    super(lc, SourceType.MACHINE);
    this._fullInstruction = fullInstruction;
  }

  get fullInstruction(): FullInstruction {
    return this._fullInstruction;
  }

  getBytes = (): number[] => this._fullInstruction.getBytes();
  getLength = (): number => this._fullInstruction.getLength();
  disassemble = (dialect: Dialect, dis: Disassembler): Tag[] => dialect.code(this, dis);
}

/**
 * Symbol definition.
 */
class SymDef<T> {
  sType: SymbolType;
  /** Definitive canonical name, traditionally used, usually an overly obtuse contraction. */
  name: string;
  /** Numeric memory address for the symbol. */
  value: T;
  /** Short phrase to describe the meaning, more understandable than the canonical name */
  descriptor: string;
  /** Extended information */
  blurb: string;

  constructor(sType: SymbolType, name: string, value: T, description: string, blurb = "") {
    this.sType = sType;
    this.name = name;
    this.value = value;
    this.descriptor = description;
    this.blurb = blurb;
  }
}

/**
 * Forces specific bytes to be interpreted as a plain byte definition.
 */
class ByteDefinitionEdict implements Edict<InstructionLike> {
  protected readonly lc: LabelsComments;
  private readonly _offset: number;
  private readonly numBytes: number;

  constructor(offset: number, length: number, lc: LabelsComments) {
    this._offset = offset;
    this.numBytes = length;
    this.lc = lc;
  }

  get length(): number {
    return this.numBytes;
  }

  get offset(): number {
    return this._offset;
  }

  create(fb: FileBlob): InstructionLike {
    const bytes = fb.getBytes().slice(this.offset, this.offset + this.length);
    return new ByteDeclaration(Array.from(bytes), this.lc);
  }

  describe(): string {
    const s = `${this.numBytes} byte${this.numBytes !== 1 ? 's' : ""}`;
    return `declare ${s} at offset ${this._offset}`;
  }

}

/**
 * Declares an address definition using the bytes at the offset.
 */
class VectorDefinitionEdict extends ByteDefinitionEdict {

  constructor(offset: number, lc: LabelsComments) {
    super(offset, 2, lc); // 2 bytes in a word
  }

  create(fb: FileBlob): InstructionLike {
    const firstByte = fb.read8(this.offset);
    const secondByte = fb.read8(this.offset + 1);
    if (firstByte !== undefined && secondByte !== undefined) {
      return new WordDefinition(firstByte, secondByte, this.lc);
    } else {
      throw Error(`Can't read word from FileBlob ${fb.name} at offset ${this.offset} `);
    }
  }


  describe(): string {
    return `declare a 16-bit word at offset ${this.length}`;
  }
}

/**
 * No code or data, just labels and comments.
 */
class LabelsCommentsOnly extends InstructionBase {

  constructor(lc: LabelsComments) {
    super(lc, SourceType.COMMENT_LABEL);
  }

  disassemble(dialect: Dialect, dis: Disassembler): Tag[] {
    return dialect.labelsComments(this.labelsComments, dis);
  }

  getBytes(): number[] {
    return [];
  }

  getLength(): number {
    return 0;
  }
}

export {
  VectorDefinitionEdict,
  ByteDefinitionEdict,
  SymDef,
  FullInstructionLine,
  PcAssign,
  LabelsCommentsOnly,
  BLANK_LINE
};
export type {Directive, InstructionLike};
