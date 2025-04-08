import {plural} from "../../ui/util.ts";
import {Tag, TAG_BLANK} from "../api.ts";
import {Byteable} from "../Byteable.ts";
import {FileBlob} from "../FileBlob.ts";
import {FullInstruction} from "../mos6502.ts";
import {LabelsComments, SourceType} from "./asm.ts";
import {ByteDeclaration} from "./ByteDeclaration.ts";
import {Dialect} from "./Dialect.ts";
import {Directive, DirectiveBase} from "./Directive.ts";
import {Disassembler} from "./Disassembler.ts";
import {Edict} from "./Edict.ts";
import {InstructionBase} from "./InstructionBase.ts";
import {SymbolType} from "./SymbolTable.ts";
import {TextDeclaration} from "./TextDeclaration.ts";

/**
 * Assembler directive that assigns a symbol to a value for literal replacement.
 *
 */
class SymbolDefinition extends DirectiveBase implements Directive {
  private readonly _symDef: SymDef<number>;

  // TODO handle generic argument correctly, not all definitions are of type number
  constructor(symDef: SymDef<number>) {
    super(new LabelsComments([], [symDef.descriptor]), SourceType.PSEUDO, false, false, true);
    this._symDef = symDef;
  }

  get symDef(): SymDef<number> {
    return this._symDef;
  }

  disassemble(dialect: Dialect, dis: Disassembler): Tag[] {
    return dialect.symbolDefinition(this, dis);
  }

  getBytes(): number[] {
    return [];
  }

  getLength(): number {
    return 0;
  }

}

/**
 * Assembly directive representing setting the program counter.
 * Often represented like this: 'org = $f000' or '* = $f000'
 */
class PcAssign extends DirectiveBase implements Directive {
  private readonly _address: number;

  constructor(address: number, labels: string[] = [], comments: string[] = []) {
    super(new LabelsComments(labels, comments), SourceType.PSEUDO, false, false, true);
    this._address = address;
  }

  get address(): number {
    return this._address;
  }

  disassemble = (dialect: Dialect, dis: Disassembler): Tag[] => dialect.pcAssign(this, dis);

  getBytes = (): number[] => [];

  getLength = (): number => 0;
}

/**
 * 16-bit word definition in architecture endianness. Currently only little-endian architectures supported.
 */
class WordDefinition extends DirectiveBase implements Directive {
  private readonly value: number;
  private readonly bytes: number[];
  private readonly decimal: boolean;

  /**
   * Use stream order of bytes, lsb and msb is determined by endianness inside this implementation.
   *
   * @param firstByte first byte in the stream.
   * @param secondByte second byte in the stream.
   * @param lc for the humans.
   * @param decimal
   */
  constructor(firstByte: number, secondByte: number, lc: LabelsComments, decimal: boolean = false) {
    super(lc, SourceType.DATA, false, false, false);
    this.decimal = decimal;
    this.value = (secondByte << 8) | firstByte;
    this.bytes = [firstByte, secondByte];
  }

  disassemble = (dialect: Dialect, dis: Disassembler): Tag[] => {
    let whodis: Disassembler = dis;
    if (this.decimal) {
      // override the radix
      whodis = {
        ...dis,
        getLiteralRadix: () => 10,
      } as Disassembler;
    }
    return dialect.words([this.value], this._lc, whodis);
  };

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

  disassemble: (_dialect: Dialect, _dis: Disassembler): Tag[] => [new Tag([TAG_BLANK], "")],

  getBytes: (): number[] => [],

  getLength: (): number => 0,

  read8: (_offset: number): number => {
    throw Error("no bytes to read");
  },

  byteString: () => "",

  get labelsComments(): LabelsComments {
    return LabelsComments.EMPTY;
  },

  get sourceType(): SourceType {
    return SourceType.BLANK;
  }
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

  /**
   * Create an edict that defines bytes with an assembler directive.
   *
   * @param offset offset in bytes of the edict
   * @param length length of the edict
   * @param lc labels and comments
   */
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
    const s = `${this.numBytes} ${plural(this.numBytes, "byte")}`;
    return `declare ${s} at offset ${this._offset}`;
  }

}

/**
 * Define text
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class TextDefinitionEdict extends ByteDefinitionEdict implements Edict<InstructionLike> {

  /**
   * Create an edict that defines a string with an assembler directive.
   *
   * @param offset offset in bytes of the edict
   * @param length length of the edict
   * @param lc labels and comments
   */
  constructor(offset: number, length: number, lc: LabelsComments) {
    super(offset, length, lc);
  }

  create(fb: FileBlob): InstructionLike {
    const bytes = fb.getBytes().slice(this.offset, this.offset + this.length);
    return new TextDeclaration(Array.from(bytes), this.lc);
  }

  describe(): string {
    const s = `a string of ${this.length} ${plural(this.length, "char")}`;
    return `declare ${s} at offset ${this.offset}`;
  }
}

/**
 * Declares an address definition using the bytes at the offset.
 */
class WordDefinitionEdict extends ByteDefinitionEdict {
  private readonly decimal: boolean;

  constructor(offset: number, lc: LabelsComments, decimal: boolean = false) {
    super(offset, 2, lc);
    this.decimal = decimal; // 2 bytes in a word
  }

  create(fb: FileBlob): InstructionLike {
    const firstByte = fb.read8(this.offset);
    const secondByte = fb.read8(this.offset + 1);
    if (firstByte !== undefined && secondByte !== undefined) {
      return new WordDefinition(firstByte, secondByte, this.lc, this.decimal);
    } else {
      throw Error(`Can't read word from FileBlob ${fb.name} at offset ${this.offset} `);
    }
  }

  describe(): string {
    return `declare a 16-bit word at offset ${this.offset}`;
  }
}

/**
 * No code or data, just labels and comments.
 */
class LabelsCommentsOnly extends InstructionBase {

  // TODO add banner macro to dialect so sections can be rendered with multiline instances of this

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
  WordDefinitionEdict,
  ByteDefinitionEdict,
  SymDef,
  FullInstructionLine,
  PcAssign,
  SymbolDefinition,
  LabelsCommentsOnly,
  BLANK_LINE
};
export type {InstructionLike};
