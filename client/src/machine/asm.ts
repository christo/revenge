// assembler / disassembler stuff - 6502-specific

import {Address, assertByte, Byteable, hex16, hex8, TODO, toStringArray, unToSigned} from "./core";
import {FileBlob} from "./FileBlob";
import {
    FullInstruction,
    InstructionSet,
    MODE_ABSOLUTE,
    MODE_ABSOLUTE_X,
    MODE_ABSOLUTE_Y,
    MODE_ACCUMULATOR,
    MODE_IMMEDIATE,
    MODE_IMPLIED,
    MODE_INDIRECT,
    MODE_INDIRECT_X,
    MODE_INDIRECT_Y,
    MODE_RELATIVE,
    MODE_ZEROPAGE,
    MODE_ZEROPAGE_X,
    MODE_ZEROPAGE_Y,
    Mos6502
} from "./mos6502";
import {BooBoo, Tag, TagSeq} from "./api";
import {TAG_ABSOLUTE, TAG_COMMENT, TAG_DATA, TAG_IN_BINARY, TAG_LABEL, TAG_OPERAND} from "./tags";

/**
 * Abstraction for holding syntactic specifications and implementing textual renditions of
 * assembly language.
 *
 */
interface Dialect {
    readonly name: string;
    readonly env: Environment;

    /**
     * Check that the given label conforms to the rules for labels, returning a possibly empty array of
     * errors.
     *
     * @param label the label to check for syntactic validity.
     */
    checkLabel(label: String): BooBoo[];

    /**
     * Return the characters that go before a line comment.
     */
    commentPrefix(): string;

    /**
     * Format the given string as a label. For example adding a trailing colon that must be present but which
     * is not part of the label name.
     * @param s
     */
    formatLabel(s: string): string;

    /**
     * Render tagged code disassembly for this dialect for the given line.
     *
     * @param fullInstructionLine one logical line of disassembly.
     * @param dis the disassembly state.
     */
    code(fullInstructionLine: FullInstructionLine, dis: Disassembler): TagSeq;

    /**
     * Render tagged byte declaration.
     *
     * @param byteable supplies the bytes to be declared as bytes.
     * @param dis the disassembly state.
     */
    bytes(byteable: Directive | FullInstructionLine, dis: Disassembler): TagSeq;

    /**
     * Render the given values as 16 bit words. If there is an odd number of bytes, the last will be forced to be
     * a byte definition.
     *
     * @param words array of word values, weighing two bytes each.
     * @param lc labels and comments
     * @param dis the disassembly context.
     */
    words(words: number[], lc: LabelsComments, dis: Disassembler): TagSeq;

    /**
     * Render tagged directive.
     *
     * @param directive the assembler directive
     * @param dis the disassembly state.
     */
    directive(directive: Directive, dis: Disassembler): TagSeq;

    /**
     * PC Assignment directive. Typical variations include:
     * ORG $abcd
     * * = $abcd
     * @param pcAssign
     * @param dis
     */
    pcAssign(pcAssign: PcAssign, dis: Disassembler): TagSeq;

    labelsComments(labelsComments: LabelsComments, dis: Disassembler): TagSeq;
}

/**
 * Turns a tagSeq into plain text, discarding the tags.
 * @param ts
 */
const tagText = (ts: TagSeq) => ts.map(t => t.value).join(" ");

/** Defines a category for any source line. */
const enum SourceType {
    /** Machine code instruction */
    MACHINE,
    /** Data declaration */
    DATA,
    /** Assembly directive or pseudo-op, including symbol definitions. */
    PSEUDO,
    /** Just label definition */
    LABEL,
    /** Comments and or labels */
    COMMENT_LABEL,
    /** Forced space. */
    BLANK
}

/** Convenience base class implementing comment and label properties. */
abstract class InstructionBase implements Instructionish {
    protected _lc: LabelsComments;
    private readonly _sourceType: SourceType;

    protected constructor(lc: LabelsComments, st: SourceType) {
        this._lc = lc;
        this._sourceType = st;
    }

    get labelsComments(): LabelsComments {
        return this._lc;
    }

    assemble(dialect: Dialect, ass: Assembler): FileBlob {
        TODO("assembler");
        return FileBlob.NULL_FILE_BLOB;
    }

    get sourceType(): SourceType {
        return this._sourceType;
    }

    abstract disassemble(dialect: Dialect, dis: Disassembler): TagSeq;

    abstract getBytes(): number[];

    abstract getLength(): number;

    get symbolOptions(): SymbolOptions {
        return SymbolOptions.NONE;
    }
}

class PcAssign extends InstructionBase implements Directive {
    private readonly _address: number;

    constructor(address: number, labels: string[] = [], comments: string[] = []) {
        super(new LabelsComments(labels, comments), SourceType.PSEUDO);
        this._address = address;
    }

    disassemble = (dialect: Dialect, dis: Disassembler): TagSeq => dialect.pcAssign(this, dis);
    getBytes = (): number[] => [];
    getLength = (): number => 0;

    get address(): number {
        return this._address;
    }
}

/** Assembler pseudo-op that reserves literal bytes. */
class ByteDeclaration extends InstructionBase implements Directive, Byteable {

    private readonly _rawBytes: Array<number>;

    constructor(rawBytes: number[], lc: LabelsComments) {
        super(lc, SourceType.DATA);
        this._rawBytes = rawBytes.map(b => assertByte(b));
    }

    getBytes = (): number[] => this._rawBytes;
    getLength = (): number => this._rawBytes.length;
    disassemble = (dialect: Dialect, dis: Disassembler): TagSeq => dialect.bytes(this, dis);
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

    disassemble = (dialect: Dialect, dis: Disassembler): TagSeq => dialect.words([this.value], this._lc, dis);
    getBytes = (): number[] => this.bytes;
    getLength = (): number => 2;
}

// noinspection JSUnusedGlobalSymbols

/** Will have different types of data later (petscii, sid music, character) */
const enum SectionType {
    /** Non-executable data. */
    DATA,
    /** Executable machine code. */
    CODE,
    /** Self-modifiable code. May not always look like valid code, but will be when executed. */
    SELF_MOD,
    /** Type is not known. */
    UNKNOWN
}

// noinspection JSUnusedGlobalSymbols

/** Designates the dynamic meaning of a sequence of bytes in the binary. */
class Section {

    static DEFAULT_TYPE = SectionType.DATA;

    startOffset: number;
    length: number;
    writeable: boolean;
    private sType: SectionType;

    constructor(startOffset: number, length: number, writeable: boolean, sType?: SectionType) {
        this.startOffset = startOffset;
        this.length = length;
        this.writeable = writeable;
        this.sType = (typeof sType === "undefined") ? Section.DEFAULT_TYPE : sType;
    }

    get endOffset() {
        return this.startOffset + this.length;
    }
}

/**
 * Need to support options, possibly at specific memory locations.
 * Global option may be lowercase opcodes.
 * Location-specific option might be arbitrary label, decimal operand, lo-byte selector "<" etc.
 * Some assembler dialects have other ways of rendering addressing modes (e.g. suffix on mnemonic).
 * Can support use of symbols instead of numbers - user may prefer to autolabel kernal addresses.
 */
class DefaultDialect implements Dialect {
    private readonly _env: Environment;

    private static readonly KW_BYTE_DECLARATION: string = '.byte';
    private static readonly KW_WORD_DECLARATION: string = '.word';

    get name(): string {
        return "Default Dialect";
    }

    get env(): Environment {
        return this._env;
    }

    constructor(env: Environment) {
        this._env = env;
    }

    checkLabel(l: String): BooBoo[] {
        // future: some assemblers insist labels must not equal/start-with/contain a mnemonic
        const regExpMatchArrays = l.matchAll(/(^\d|\s)/g);
        if (regExpMatchArrays) {
            return [new BooBoo(`Label must not start with digit or contain whitespace: ${l}`)];
        } else {
            return [];
        }
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Parse input from index offset characters in until end of line or end of input,
     * whichever's first but the index must be inside the range of the string's chars.
     * Interpret mnemonic syntax of our assembly dialect and return a datastructure
     * of properties for that machine instruction, including operands and expected
     * runtime in clock cycles.
     * @param input
     * @param index
     */
    assemble(input: string, index: number) {
        if (index >= input.length || index < 0) {
            throw Error("index out of range")
        }
        TODO("assemble");
        // parsing can fail if wrong or not enough bytes

        // return Instruction + 0-2 bytes operand + new index (this may be beyond input which means finished)
        // or possibly return pseudo op
        // return value could also contain input offset, length, maybe metadata for comment etc.
    }

    private taggedCode(fil: FullInstructionLine, dis: Disassembler): TagSeq {
        // add the mnemonic tag and also the mnemonic category
        const mi = fil.fullInstruction.instruction;
        const mnemonic: Tag = new Tag(mi.op.mnemonic.toLowerCase(), `mn ${mi.op.cat}`);
        const operandText = this.renderOperand(fil.fullInstruction, dis).trim();
        // check the symbol table for a symbol that matches this operand
        if (operandText.length > 0) {
            const operandTag = new Tag(operandText, `opnd ${mi.mode.code}`);
            if (fil.fullInstruction.staticallyResolvableOperand()) {
                const opnd = fil.fullInstruction.operandValue();
                // future: check other addressing modes
                // check if the operand is an address inside the binary
                if (fil.fullInstruction.instruction.mode === MODE_ABSOLUTE && dis.isInBinary(opnd)) {
                    operandTag.tags.push(TAG_IN_BINARY)
                }
                operandTag.data = [["opnd_val", hex16(opnd)]];
            }
            return [mnemonic, operandTag];
        } else {
            return [mnemonic];
        }
    }

    private renderLabels(labels: string[]): string {
        const le = this._env.targetLineEndings();
        return labels.map(s => this.formatLabel(s)).join(le);
    }

    private renderComments(comments: string[]): string {
        const le = this._env.targetLineEndings();
        const cp = this.commentPrefix();
        return comments.map(c => cp + c.replaceAll(le, le + cp)).join("");
    }

    commentPrefix() {
        return "; ";
    }

    formatLabel(s: string) {
        return s + ": ";
    }

    /**
     * Creates byte declaration source for the given byteable.
     *
     * @param b
     * @private
     */
    private byteDeclaration(b: Byteable): TagSeq {
        if (b.getLength() === 0) {
            throw Error("not entirely sure how to declare zero bytes");
        }
        let kw: Tag = new Tag(DefaultDialect.KW_BYTE_DECLARATION, 'kw');
        const hexTag = new Tag(b.getBytes().map(this.hexByteText).join(", "), "hexarray");
        return [kw, hexTag];
    }

    private wordDeclaration(words: number[]): TagSeq {
        let kw: Tag = new Tag(DefaultDialect.KW_WORD_DECLARATION, 'kw');
        const values: Tag = new Tag(words.map(this.hexWordText).join(", "), "hexarray");
        return [kw, values];
    }

    private hexByteText(b: number) {
        return "$" + hex8(b);
    }

    private hexWordText(x: number) {
        return "$" + hex16(x);
    }

    /**
     * Returns only the operand portion, trimmed.
     * Currently, only supports hex literals for operand values;
     * @param il
     * @param dis
     * @private
     */
    private renderOperand(il: FullInstruction, dis: Disassembler): string {

        let operand = "";
        switch (il.instruction.mode) {
            case MODE_ACCUMULATOR:
                // operand = "a"; // in some weird dialects this may be so
                operand = ""; // implied accumulator not manifest
                break;
            case MODE_ABSOLUTE:
                const x = il.operand16();
                const symbol = dis.getSymbol(x);
                if (symbol !== undefined) {
                    operand = symbol.name;
                    dis.addSymbolDefinition(symbol);
                    dis.addStat("symbol definition");
                } else {
                    operand = this.hexWordText(x);
                }
                break;
            case MODE_ABSOLUTE_X:
                operand = this.hexWordText(il.operand16()) + ", x";
                break;
            case MODE_ABSOLUTE_Y:
                operand = this.hexWordText(il.operand16()) + ", y";
                break;
            case MODE_IMMEDIATE:
                operand = "#" + this.hexByteText(il.firstByte);
                break;
            case MODE_IMPLIED:
                operand = "";
                break;
            case MODE_INDIRECT:
                operand = "(" + this.hexWordText(il.operand16()) + ")";
                break;
            case MODE_INDIRECT_X:
                operand = "(" + this.hexByteText(il.firstByte) + ", x)";
                break;
            case MODE_INDIRECT_Y:
                operand = "(" + this.hexByteText(il.firstByte) + "), y";
                break;
            case MODE_RELATIVE:
                // render decimal two's complement 8-bit
                operand = unToSigned(il.firstByte).toString(10);
                break;
            case MODE_ZEROPAGE:
                operand = this.hexByteText(il.firstByte);
                break;
            case MODE_ZEROPAGE_X:
                operand = this.hexByteText(il.firstByte) + ", x"
                break;
            case MODE_ZEROPAGE_Y:
                operand = this.hexByteText(il.firstByte) + ", y"
                break;
        }
        return operand;
    }

    bytes(x: FullInstructionLine, dis: Disassembler): TagSeq {
        // future: context may give us rules about grouping, pattern detection etc.
        const comments: Tag = new Tag(this.renderComments(x.labelsComments.comments), TAG_COMMENT);
        const labels: Tag = new Tag(this.renderLabels(x.labelsComments.labels), TAG_LABEL);
        const data: Tag = new Tag(this._env.indent() + tagText(this.byteDeclaration(x)), TAG_DATA);
        return [comments, labels, data];
    }

    words(words: number[], lc: LabelsComments, dis: Disassembler): TagSeq {
        const comments: Tag = new Tag(this.renderComments(lc.comments), TAG_COMMENT);
        const labels: Tag = new Tag(this.renderLabels(lc.labels), TAG_LABEL);
        const tags: TagSeq = this.wordDeclaration(words)
        const data: Tag = new Tag(this._env.indent() + tagText(tags), TAG_DATA);
        return [comments, labels, data];
    }

    code(fil: FullInstructionLine, dis: Disassembler): TagSeq {
        const comments: Tag = new Tag(this.renderComments(fil.labelsComments.comments), TAG_COMMENT);
        const labels: Tag = new Tag(this.renderLabels(fil.labelsComments.labels), TAG_LABEL);
        return [comments, labels, ...this.taggedCode(fil, dis)];
    }

    directive(directive: Directive, dis: Disassembler): TagSeq {
        TODO();
        return [];
    }

    pcAssign(pcAssign: PcAssign, dis: Disassembler): TagSeq {
        const comments = new Tag(this.renderComments(pcAssign.labelsComments.comments), TAG_COMMENT);
        const labels = new Tag(this.renderLabels(pcAssign.labelsComments.labels), TAG_LABEL);
        const pc = new Tag("* =", "code");
        const addr = new Tag(this.hexWordText(pcAssign.address), [TAG_ABSOLUTE, TAG_OPERAND]);
        const dummy = new Tag("_", "addr");
        return [comments, labels, dummy, pc, addr];
    }

    labelsComments(labelsComments: LabelsComments, dis: Disassembler): TagSeq {
        const labels: Tag = new Tag(this.renderLabels(labelsComments.labels), TAG_LABEL);
        const comments: Tag = new Tag(this.renderComments(labelsComments.comments), TAG_COMMENT);
        return [comments, labels];
    }
}

/**
 * Assembler directive. Has a source form, may produce bytes during assembly and may be synthesised during
 * disassembly, but does not necessarily correspond to machine instructions and may not even produce code output.
 */
interface Directive extends Instructionish {
    // symbol definition
    // macro definition
    // cpu pragma
}

/** syntax-independent assembler */
class Assembler {
    constructor() {
        TODO();
    }
}

/**
 * Syntax-independent form for any assemblable and disassemblable element, implementations include machine instructions
 * and assembler directives. The {@link Assembler} and {@link Disassembler} hold state for a sequence of such items
 * during the assembly or disassembly and the {@link Dialect} performs syntax-specific source text parsing and
 * unparsing. This decomposition supports program transformation workflows such as syntax translation and peephole
 * optimisation.
 */
interface Instructionish extends Byteable {

    get labelsComments(): LabelsComments;

    /**
     * Disassembles the implementation's instruction with the given stateful disassembler, in the given dialect.
     *
     * @param dialect the syntax-specifics for disassembly.
     * @param dis the stateful disassembler.
     */
    disassemble(dialect: Dialect, dis: Disassembler): TagSeq

    /**
     * Assemble this instruction in the given dialect with the given assembler.
     *
     * @param dialect syntax to use
     * @param ass stateful assembler
     */
    assemble(dialect: Dialect, ass: Assembler): FileBlob

    /**
     * Return the {@link SourceType} for the generated code (regardless of comments).
     */
    get sourceType(): SourceType;
}

/**
 * No code or data, just labels and comments.
 */
class LabelsCommentsOnly extends InstructionBase {

    constructor(lc: LabelsComments) {
        super(lc, SourceType.COMMENT_LABEL);
    }

    disassemble(dialect: Dialect, dis: Disassembler): TagSeq {
        return dialect.labelsComments(this.labelsComments, dis);
    }

    getBytes(): number[] {
        return [];
    }

    getLength(): number {
        return 0;
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
    disassemble = (dialect: Dialect, dis: Disassembler): TagSeq => dialect.code(this, dis);
}

/**
 * Holds config, options etc.
 * Difference between Dialect and Environment is that a Dialect might be specific to the target assembler
 * syntax used, whereas the Environment has local configuration like line endings, comment decoration styling,
 * text encoding, natural language (e.g. can generate german comments) and per-line choices for using labels
 * including globally known memory map symbols. Some people want numeric values for certain locations, other
 * people want symbols. Dialect holds stuff like what is the comment style - prefix char for line comments is
 * often ';' but for kick assembler, it's '//' and kick also supports block comments whereas others may not.
 * Having said that, the Dialect should accept configuration and the Environment is the best place for this to
 * live.
 *
 * Reverse engineering session config, etc. should go in the environment but maybe the default environment
 * for newly created sessions can be configured per-user too.
 *
 */
class Environment {
    static DEFAULT_ENV = new Environment();

    targetLineEndings() {
        return "\n";
    }

    indent() {
        return "    ";
    }
}

enum SymbolType {
    "reg",
    "sub"
}

/**
 * Symbol definition.
 */
class SymDef {
    sType: SymbolType;
    /** Definitive canonical name, traditionally used, usually an overly obtuse contraction. */
    name: string;
    /** Numeric memory address for the symbol. */
    value: Address;
    /** Short phrase to describe the meaning, more understandable than the canonical name */
    descriptor: string;
    /** Extended information */
    blurb: string;

    constructor(sType: SymbolType, name: string, value: Address, description: string, blurb: string = "") {
        this.sType = sType;
        this.name = name;
        this.value = value;
        this.descriptor = description;
        this.blurb = blurb;
    }
}

/**
 * Table of single symbol to single address. Names and addresses must be unique.
 */
class SymbolTable {

    // future: keep kernal symbols in a separate table from user-defined symbols, also can have multimap

    private addressToSymbol: Map<Address, SymDef> = new Map<Address, SymDef>();
    private name: string;
    private nameToSymbol: Map<string, SymDef> = new Map<string, SymDef>();

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Register a new symbol for the described subroutine. One must not exist with the same name or address.
     *
     * @param addr address the symbol refers to.
     * @param name name to be used instead of the address.
     * @param desc a more verbose description of the symbol.
     * @param blurb extended info.
     */
    sub(addr: Address, name: string, desc: string, blurb: string = "") {
        this.sym(SymbolType.sub, addr, name, desc, blurb);
    }

    reg(addr: Address, name: string, desc: string, blurb: string = "") {
        this.sym(SymbolType.reg, addr, name, desc, blurb);
    }

    sym(sType: SymbolType, addr: Address, name: string, desc: string, blurb: string = "") {
        if (addr < 0 || addr >= 1 << 16) {
            throw Error("address out of range");
        }
        name = name.trim();
        desc = desc.trim();
        blurb = blurb.trim();
        if (name.length < 1) {
            throw Error("name empty");
        }
        if (this.addressToSymbol.has(addr) || this.nameToSymbol.has(name)) {
            throw Error(`${this.name}: non-unique address (${addr}) or name (${name})`);
        }
        const symDef = new SymDef(sType, name, addr, desc, blurb);
        this.addressToSymbol.set(addr, symDef);
        this.nameToSymbol.set(name, symDef);
    }


    byName(name: string) {
        return this.nameToSymbol.get(name);
    }

    byAddress(addr: Address) {
        return this.addressToSymbol.get(addr);
    }
}

/**
 * Metadata valuable for disassembling a {@link FileBlob}. Expect this interface to evolve dramatically.
 */
interface DisassemblyMeta {
    /**
     * The address the file should be loaded into.
     * In the future, we need to support multiple segments loaded into
     * different addresses; some file formats accommodate this.
     *
     * @param fb the file to get the vector from
     */
    baseAddress(fb: FileBlob): number;

    /**
     * Address of start of code for a warm boot; i.e. when RESTORE is hit (?)
     * @param fb the fileblob.
     */
    disassemblyStartOffset(fb: FileBlob): number;

    /**
     * The offset from the start of the fileblob at which the base address is to be located. This skips any header data
     * that isn't real file content.
     */
    contentStartOffset(): number;

    /**
     * Gets the edict defined for the given offset if one is defined.
     *
     * @param offset
     */
    getEdict(offset: number): Edict<Instructionish> | undefined;

    /**
     * Return a list of address + LabelsComments
     */
    getJumpTargets(fb: FileBlob): [Address, LabelsComments][];

    /**
     * Based on the known machine.
     */
    getSymbolTable(): SymbolTable;

    isInBinary(addr: Address, fb: FileBlob): boolean;
}

class ByteDefinitionEdict implements Edict<Instructionish> {
    private readonly _offset: number;
    private readonly numBytes: number;
    protected readonly lc: LabelsComments;

    constructor(offset: number, length: number, lc: LabelsComments) {
        this._offset = offset;
        this.numBytes = length;
        this.lc = lc;
    }

    create(fb: FileBlob): Instructionish {
        const bytes = fb.getBytes().slice(this.offset, this.offset + this.length);
        return new ByteDeclaration(Array.from(bytes), this.lc);
    }

    get length(): number {
        return this.numBytes;
    }

    get offset(): number {
        return this._offset;
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

    create(fb: FileBlob): Instructionish {
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

const mkLabels = (labels: string[] | string) => new LabelsComments(labels);
const mkComments = (comments: string[] | string) => new LabelsComments([], comments);

export class LabelsComments {
    private readonly _labels: string[];
    private readonly _comments: string[];

    constructor(labels: string[] | string = [], comments: string[] | string = []) {
        this._labels = toStringArray(labels);
        this._comments = toStringArray(comments);
    }

    longestLabel = () => this.labels.map(s => s.length).reduce((p, c) => p > c ? p : c);

    addLabels(labels: string[] | string) {
        toStringArray(labels).forEach(s => this._labels.push(s));
    }

    addComments(comments: string[] | string) {
        toStringArray(comments).forEach(s => this._comments.push(s));
    }

    /** Mutates this by adding all the given labels and comments; */
    merge(lc: LabelsComments) {
        this.addLabels(lc._labels);
        this.addComments(lc._comments);
    }

    get labels() {
        return this._labels
    }

    get comments() {
        return this._comments;
    }


    /**
     * Total number of labels plus comments.
     */
    length() {
        return this._comments.length + this._labels.length;
    }
}

type JumpTargetFetcher = (fb: FileBlob) => [Address, LabelsComments][];

class DisassemblyMetaImpl implements DisassemblyMeta {

    /** A bit stinky - should never be used and probably not exist. */
    static NULL_DISSASSEMBLY_META = new DisassemblyMetaImpl(0, 0, 0, [], (fb) => [], new SymbolTable("null"));

    private readonly _baseAddressOffset: number;
    private readonly _resetVectorOffset: number;
    private readonly _contentStartOffset: number;
    private readonly edicts: { [id: number]: Edict<Instructionish>; };
    private readonly jumpTargetFetcher: JumpTargetFetcher;
    private symbolTable: SymbolTable;

    constructor(
        baseAddressOffset: number,
        resetVectorOffset: number,
        contentStartOffset: number,
        edicts: Edict<Instructionish>[],
        getJumpTargets: JumpTargetFetcher,
        symbolTable: SymbolTable
    ) {

        this._baseAddressOffset = baseAddressOffset;
        this._contentStartOffset = contentStartOffset;
        this.symbolTable = symbolTable;

        // keep the offsets
        this._resetVectorOffset = resetVectorOffset;
        this.edicts = {};
        for (let i = 0; i < edicts.length; i++) {
            const edict = edicts[i];
            this.edicts[edict.offset] = edict;
        }
        this.jumpTargetFetcher = getJumpTargets;
    }

    baseAddress(fb: FileBlob): number {
        return fb.read16(this._baseAddressOffset);
    }

    contentStartOffset(): number {
        return this._contentStartOffset;
    }

    isInBinary(addr: Address, fb: FileBlob): boolean {
        const baseAddress = fb.read16(this._baseAddressOffset);
        const contentStartAddress = baseAddress + this._contentStartOffset;
        const contentEndAddress = baseAddress + fb.getLength();
        // last address location is 1 below last byte
        return addr >= contentStartAddress && addr <= contentEndAddress - 1;
    }

    disassemblyStartOffset(fb: FileBlob): number {
        const resetAddr = fb.read16(this._resetVectorOffset);
        // two bytes make an address
        const resetMsb = resetAddr + 1;
        const resetVectorIsInBinary = this.inBinary(resetMsb, fb);
        if (resetVectorIsInBinary) {
            return resetAddr - fb.read16(this._baseAddressOffset);
        } else {
            // reset vector is outside binary, so start disassembly at content start?
            console.log(`reset vector is outside binary ($${hex16(resetAddr)})`);
            return this.contentStartOffset();
        }
    }

    private inBinary(addr: number, fb: FileBlob) {
        const base = this.baseAddress(fb);
        return addr >= base && addr <= base + fb.getLength();
    }

    getEdict(address: number): Edict<Instructionish> | undefined {
        return this.edicts[address];
    }

    getJumpTargets(fb: FileBlob): [Address, LabelsComments][] {
        return this.jumpTargetFetcher(fb);
    }

    getSymbolTable(): SymbolTable {
        return this.symbolTable;
    }
}

/**
 * Rule for specifying the disassembly of a sequence of bytes at a binary offset. File formats or
 * user demand can require that a location be interpreted as code or a labeled address definition etc.
 * Examples include forced interpretation of bytes as code since the file format specifies code entry
 * points.
 */
interface Edict<T> {

    get offset(): number;

    /**
     * Number of bytes to be specified.
     */
    get length(): number;

    /**
     * Creates the instance from the bytes at address
     * @param fb the binary.
     * @return the instance.
     */
    create(fb: FileBlob): T;

    /**
     * Description of the edict for referring to problems with it.
     */
    describe(): string;
}

/** Stateful translator of bytes to their parsed instruction line */
class Disassembler {
    private iset: InstructionSet;
    originalIndex: number;
    currentIndex: number;
    fb: FileBlob;
    private readonly segmentBaseAddress: number;
    private stats: Map<string, number>;
    private predefLc: [Address, LabelsComments][];

    private disMeta: DisassemblyMeta;
    private symbolDefinitions: Map<string, SymDef>;

    constructor(iset: InstructionSet, fb: FileBlob, bs: BlobSniffer) {
        this.iset = iset;
        const dm = bs.getMeta();
        let index = dm.contentStartOffset();
        let bytes: number[] = fb.getBytes();
        if (index >= bytes.length || index < 0) {
            throw Error(`index '${index}' out of range`);
        }
        this.originalIndex = index;
        this.currentIndex = index;
        this.fb = fb;
        this.segmentBaseAddress = dm.baseAddress(fb);
        this.predefLc = dm.getJumpTargets(fb);
        this.disMeta = dm;
        this.symbolDefinitions = new Map<string, SymDef>();
        this.stats = new Map<string, number>();
    }

    private eatBytes(count: number): number[] {
        const bytes: number[] = [];
        for (let i = 1; i <= count; i++) {
            bytes.push(this.eatByte());
        }
        return bytes;
    }

    private eatByteOrDie() {
        if (this.currentIndex >= this.fb.getBytes().length) {
            throw Error("No more bytes");
        }
        return this.eatByte();
    }

    private eatByte() {
        const value = this.fb.read8(this.currentIndex++);
        if (typeof value === "undefined") {
            throw Error(`Illegal state, no byte at index ${this.currentIndex}`);
        } else {
            return (value & 0xff);
        }
    }

    /**
     * Currently responsible for deciding which Instructionish should be constructed at the current index point
     * and advances the index by the correct number of bytes.
     */
    nextInstructionLine(): Instructionish {
        // some helper functions
        const lc = this.mkPredefLabelsComments(this.currentAddress);

        let instructionish: Instructionish;

        // TODO merge edict check for 0-n bytes ahead where n is the instruction size with opcode = current byte

        const maybeInstruction: Instructionish | undefined = this.maybeMkEdict(lc);
        if (maybeInstruction !== undefined) {
            instructionish = maybeInstruction;
        } else {
            const isIllegal = (n: number) => Mos6502.INSTRUCTIONS.op(n) === undefined;
            const opcode = this.peekByte();
            if (opcode === undefined) {
                throw Error(`Cannot get byte at offset ${this.currentIndex} from file ${this.fb.name}`);
            } else if (isIllegal(opcode)) {
                // slurp up multiple illegal opcodes in a row
                let numBytes = 1;
                // code smell: too heavy-handed although the only probable failure cause of at() is eof
                // @ts-ignore
                while (numBytes < this.bytesLeftInFile() && isIllegal(this.fb.getBytes().at(this.currentIndex + numBytes))) {
                    numBytes++;
                }
                lc.addComments(numBytes === 1 ? "illegal opcode" : "illegal opcodes");
                instructionish = new ByteDeclaration(this.eatBytes(numBytes), lc);
            } else {
                // if there are not enough bytes for this whole instruction, return a ByteDeclaration for this byte
                // we don't yet know if an instruction will fit for the next byte
                const instLen = Mos6502.INSTRUCTIONS.numBytes(opcode) || 1;

                if (this.bytesLeftInFile() < instLen) {
                    lc.addComments("instruction won't fit");
                    instructionish = new ByteDeclaration(this.eatBytes(1), lc);
                } else {
                    instructionish = this.edictAwareInstruction(opcode, lc);
                }
            }

        }

        return instructionish;
    }

    private peekByte() {
        return this.fb.read8(this.currentIndex);
    }

    isInBinary(addr: Address) {
        return this.disMeta.isInBinary(addr, this.fb);
    }

    /**
     * If the current byte is interpreted as an instruction, checks the bytes ahead for any defined edicts that would
     * clash with it, if they exist, then declare bytes up to the edict instead. If there is no clash, return the
     * instruction.
     *
     * @param currentByte the byte already read
     * @param lc labels and comments
     */
    edictAwareInstruction(currentByte: number, lc: LabelsComments): Instructionish {

        // check if there's an edict n ahead of currentIndex
        const edictAhead = (n: number) => this.disMeta.getEdict(this.currentIndex + n) !== undefined;

        // make an edict-enforced byte declaration of the given length
        const mkEdictInferredByteDec = (n: number) => {
            lc.addComments(`inferred via edict@+${n}`); // need a better way of communicating this to the user
            return new ByteDeclaration(this.eatBytes(n), lc);
        };

        const instLen = Mos6502.INSTRUCTIONS.numBytes(currentByte);
        // current index is the byte following the opcode which we've already checked for an edict
        // check for edict inside the bytes this instruction would need
        if (instLen === 2 && edictAhead(1)) {
            return mkEdictInferredByteDec(1);
        } else if (instLen === 3) {
            if (edictAhead(2)) {
                return mkEdictInferredByteDec(2);
            } else if (edictAhead(3)) {
                return mkEdictInferredByteDec(3);
            }
        }
        // by now we know we must consume the current byte
        this.currentIndex++;
        return this.mkInstruction(currentByte, lc);
    }

    private bytesLeftInFile() {
        return this.fb.getBytes().length - this.currentIndex;
    }

    /**
     * For a known instruction opcode, construct the instruction with the {@link LabelsComments} and consume the
     * requisite bytes.
     */
    private mkInstruction(opcode: number, labelsComments: LabelsComments) {
        const numInstructionBytes = Mos6502.INSTRUCTIONS.numBytes(opcode) || 1
        // interpret as instruction
        let firstOperandByte = 0;
        let secondOperandByte = 0;
        if (numInstructionBytes > 1) {
            firstOperandByte = this.eatByteOrDie();
        }
        if (numInstructionBytes === 3) {
            secondOperandByte = this.eatByteOrDie();
        }
        const il = new FullInstruction(this.iset.instruction(opcode), firstOperandByte, secondOperandByte);
        return new FullInstructionLine(il, labelsComments);
    }

    hasNext() {
        return this.currentIndex < this.fb.getBytes().length;
    }

    /**
     * Returns zero or more {@link LabelsComments} defined for the given address.
     * @param addr
     */
    mkPredefLabelsComments(addr: Address): LabelsComments {
        return this.predefLc.filter(t => t[0] === addr).map(t => t[1]).reduce((p, c) => {
            p.merge(c);
            return p;
        }, new LabelsComments());
    }

    /**
     * Determine all jump targets both statically defined and implied by the given sequence of address,instruction
     * pairs. Only those targets that lie within the address range of our loaded binary are returned.
     *
     */
    jumpTargets = (instructions: [Address, FullInstruction][]): Address[] => {
        // collect predefined jump targets
        const fromDm = this.predefLc.map(t => t[0]);

        // instructions that are jumps and have a resolvable destination
        const resolvableJump = (addrInst: [number, FullInstruction]) => {
            return addrInst[1].instruction.op.isJump && addrInst[1].staticallyResolvableOperand();
        };

        // collect targets of all current jump instructions

        // for all jump instructions, collect the destination address
        const allJumpTargets: Address[] = instructions
            .filter(addrInst => resolvableJump(addrInst))   // only jumps, only statically resolvable
            .map(j => j[1].resolveOperandAddress(j[0]))     // resolve pc-relative operands
            .concat(fromDm)                                 // add the predefs
            .filter(this.addressInRange);                   // only those in range of the loaded binary

        return allJumpTargets;
    };

    /**
     * Returns true iff the given address is within the memory range of the currently loaded file.
     *
     * @param addr the address to query.
     */
    private addressInRange = (addr: Address): boolean => {
        const notTooLow = addr >= this.segmentBaseAddress;
        const notTooHigh = addr <= this.segmentBaseAddress + this.fb.getLength() - this.originalIndex;
        return notTooLow && notTooHigh;
    };

    get currentAddress(): Address {
        return this.segmentBaseAddress + this.currentIndex - this.originalIndex;
    }

    getSymbol(addr: Address): SymDef | undefined {
        return this.disMeta.getSymbolTable().byAddress(addr);
    }

    /** Makes a symbol definition edict */
    addSymbolDefinition(symbol: SymDef) {
        this.symbolDefinitions.set(symbol.name, symbol);
    }

    private maybeMkEdict(lc: LabelsComments) {
        const edict = this.disMeta.getEdict(this.currentIndex);
        if (edict !== undefined) {
            return this.edictOrBust(edict, this.bytesLeftInFile(), lc);
        }
        return undefined;
    }

    private edictOrBust(edict: Edict<Instructionish>, remainingBytes: number, lc: LabelsComments) {
        // if the edict won't fit in the remaining bytes, just get its labels/comments and explain
        const edictWillFit = edict.length <= remainingBytes;
        if (edictWillFit) {
            this.currentIndex += edict.length;
            return edict.create(this.fb);
        } else {
            const elc = edict.create(this.fb).labelsComments;
            const explainLc = elc.length() > 0 ? ` (preserving ${elc.length()} labels/comments)` : "";
            lc.addComments(`End of file clashes with edict${explainLc}: '${edict.describe()}'`);
            lc.merge(elc);
            this.currentIndex += remainingBytes;
            // fall through
        }
        return undefined;
    }

    /**
     * Adds to the value of the named statistic. If it's a new stat, first initialises it to zero.
     * @param name name of the statistic
     * @param x value to add, defaults to 1
     */
    addStat(name: string, x: number = 1) {
        let existing = this.stats.get(name) || 0;
        this.stats.set(name, x + existing);
    }

    /**
     * Sets the stat with the given name to the given value regardless of whether it has
     * @param name
     * @param x
     */
    setStat(name: string, x: number) {
        this.stats.set(name, x);
    }

    getStats() {
        return this.stats;
    }
}

/**
 * Abstraction for scoring relative confidence in file content categorisation.
 */
interface BlobSniffer {
    /**
     * Produces a score for the given FileBlob, higher numbers indicate a corresponding higher confidence of
     * a match. Values should be coefficients so that an aggregate score is achieved by multiplication. A
     * value of 1 signifies no indication of a match, less than 1 signifies unlikeliness and greater than 1
     * signifies increasing confidence. Zero is absolute certainty. Negative values must not be returned.
     * @param fb the file contents to sniff
     */
    sniff(fb: FileBlob): number;

    /**
     * This smells, it's a bag of disassembly-specific detail transported from the thing that knows about the
     * file contents and the disassembler who needs to construct the {@link DataView2}. Is there a generic
     * way to bundle this stuff? What's the common API such that ignorant intermediaries can be blissfull
     * as they work at a non-specific altitude? Consider an inversion as I did with the Dialect API. Or
     * use generics.
     */
    getMeta(): DisassemblyMeta;

    name: string;
    desc: string;
    tags: string[];
}

/**
 * Represents a file type where file type detection heuristics such as
 * file name extension, magic number prefixes detect file contents.
 */
class BlobType implements BlobSniffer {

    name: string;
    desc: string;
    exts: string[];
    tags: string[];
    prefix: Uint8Array;
    dm: DisassemblyMeta;

    constructor(name: string, desc: string, tags: string[], ext?: string, prefix?: ArrayLike<number>, dm?: DisassemblyMeta) {
        this.desc = desc;
        this.name = name;
        this.dm = dm ? dm : DisassemblyMetaImpl.NULL_DISSASSEMBLY_META;
        this.exts = ext ? [ext] : [];
        this.tags = tags;
        this.prefix = prefix ? new Uint8Array(prefix) : new Uint8Array(0);
    }

    extensionMatch(fb: FileBlob) {
        return this.exts.reduce((a, n) => a || fb.hasExt(n), false);
    }

    getMeta(): DisassemblyMeta {
        return this.dm;
    }

    dataMatch(fileBlob: FileBlob): boolean {
        return fileBlob.submatch(this.prefix, 0);
    }

    sniff(fb: FileBlob): number {
        return (this.dataMatch(fb) ? 2 : 0.5) * (this.extensionMatch(fb) ? 1.5 : 0.9);
    }
}

const UNKNOWN_BLOB = new BlobType("unknown", "type not detected", []);

export {
    BlobType,
    DefaultDialect,
    Disassembler,
    DisassemblyMetaImpl,
    Environment,
    FullInstructionLine,
    LabelsCommentsOnly,
    PcAssign,
    Section,
    SectionType,
    tagText,
    UNKNOWN_BLOB,
    ByteDefinitionEdict,
    VectorDefinitionEdict,
    mkLabels,
    mkComments,
    SymDef,
    SymbolTable
};
export type {
    BlobSniffer,
    DisassemblyMeta,
    Instructionish,
    Dialect,
    Directive,
    Edict,
    JumpTargetFetcher
};