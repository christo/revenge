// assembler / disassembler stuff

import {assertByte, hex16, hex8, unsignedToSigned} from "../misc/BinUtils";
import {FileBlob} from "./FileBlob";
import {
    FullInstruction,
    Instruction,
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
import {BlobToActions, Detail, UserAction} from "./revenge";

const TODO = (mesg = "") => {
    throw Error(`Not Implemented ${mesg}`)
};

/**
 * Should be a 16-bit unsigned number.
 * TODO decide whether to use some kind of TypeScript foo to constrain the values...
 * ...can't use recursive tail-call type trick because max depth is 1000
 */
type Address = number;

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
    code(fullInstructionLine:FullInstructionLine, dis: Disassembler): TagSeq;

    /**
     * Render tagged byte declaration.
     *
     * @param byteable supplies the bytes to be declared as bytes.
     * @param dis the disassembly state.
     */
    bytes(byteable:Directive | FullInstructionLine, dis: Disassembler): TagSeq;

    /**
     * Render the given values as 16 bit words. If there is an odd number of bytes, the last will be forced to be
     * a byte definition.
     *
     * @param words array of word values, weighing two bytes each.
     * @param lc labels and comments
     * @param dis the disassembly context.
     */
    words(words:number[], lc:LabelsComments, dis: Disassembler): TagSeq;

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
}

/**
 * Error class, all the sensible names have been domain squatted by typescript/javascript.
 */
class BooBoo {
    private mesg: string;

    constructor(mesg: string) {
        this.mesg = mesg;
    }
}

/**
 * Abstraction for representing data with a tag. This makes transformation to html and also text
 * straightforward without any web dependencies, although the tag names must conform to the rules
 * for css classes (e.g. space-separated).
 */
type Tag = [string, string]

/**
 * Abstraction that corresponds to a logical line of listing output.
 */
type TagSeq = Tag[]

/** Convenience base class implementing comment and label properties. */
abstract class InstructionBase implements Instructionish {
    protected _lc: LabelsComments;

    protected constructor(lc:LabelsComments) {
        this._lc = lc;
    }

    get labelsComments(): LabelsComments {
        return this._lc;
    }

    assemble(dialect: Dialect, ass: Assembler): FileBlob {
        TODO("assembler");
        return FileBlob.NULL_FILE_BLOB;
    }

    abstract disassemble(dialect: Dialect, dis: Disassembler): TagSeq;

    abstract get sourceType(): SourceType;

    /**
     * Default zero byte implementation.
     */
    getBytes(): number[] {
        return [];
    }

    /**
     * Default zero byte implementation.
     */
    getLength(): number {
        return 0;
    }
}

class PcAssign extends InstructionBase implements Directive {
    private readonly _address: number;

    constructor(address: number, labels:string[] = [], comments:string[] = []) {
        super(new LabelsComments(labels, comments));
        this._address = address;
    }

    disassemble(dialect: Dialect, dis: Disassembler): TagSeq {
        return dialect.pcAssign(this, dis);
    }

    get address(): number {
        return this._address;
    }

    get sourceType(): SourceType {
        return SourceType.PSEUDO;
    }
}

/** Assembler pseudo-op that reserves literal bytes. */
class ByteDeclaration extends InstructionBase implements Directive {

    private readonly _rawBytes: Array<number>;

    constructor(rawBytes: Array<number>, lc: LabelsComments) {
        super(lc);
        this._rawBytes = rawBytes.map(b => assertByte(b));
    }

    getBytes(): number[] {
        return this._rawBytes;
    }

    getLength(): number {
        return this._rawBytes.length;
    }

    disassemble(dialect: Dialect, dis: Disassembler): TagSeq {
        return dialect.bytes(this, dis);
    }

    get sourceType(): SourceType {
        return SourceType.DATA;
    }
}

/**
 * 16-bit word definition in architecture endianness. Currently only little-endian architectures supported.
 */
class WordDefinition extends InstructionBase implements Directive {
    private readonly value:number;

    /**
     * Use stream order of bytes, lsb and msb is determined by endianness inside this implementation.
     *
     * @param firstByte first byte in the stream.
     * @param secondByte second byte in the stream.
     * @param lc for the humans.
     */
    constructor(firstByte:number, secondByte:number, lc: LabelsComments) {
        super(lc);
        this.value = (secondByte << 8) | firstByte; // currently hard-coded to little-endian
    }

    disassemble(dialect: Dialect, dis: Disassembler): TagSeq {
        return dialect.words([this.value], this._lc, dis);
    }

    get sourceType(): SourceType {
        return SourceType.DATA;
    }
}

/**
 * Turns a tagSeq into plain text, discarding the tags.
 * @param ts
 */
const tagText = (ts: TagSeq) => ts.map(t => t[1]).join(" ");
// noinspection JSUnusedGlobalSymbols

/** Will have different types of data later (petscii, sid music, character) */
enum SectionType {
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

enum SourceType {
    /** Machine code instruction */
    MACHINE,
    /** Data declaration */
    DATA,
    /** Assembly directive or pseudo-op, including symbol definitions. */
    PSEUDO,
    /** Label definition */
    LABEL,
    /** Something for the humans */
    COMMENT,
    /** Forced space. */
    BLANK
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

    private taggedCode(mi: Instruction, fil: FullInstructionLine): TagSeq {
        // add the mnemonic tag and also the mnemonic category
        const mnemonic: Tag = [`mn ${mi.op.cat}`, mi.op.mnemonic.toLowerCase()];
        const il = fil.fullInstruction;
        const operandText = this.renderOperand(il).trim();
        if (operandText.length > 0) {
            return [mnemonic, [`opnd ${mi.mode.code}`, operandText]]
        } else {
            return [mnemonic];
        }
    }

    private renderLabels(labels: string[]) {
        const le = this._env.targetLineEndings();
        return labels.map(s => this.formatLabel(s)).join(le);
    }

    private renderComments(comments:string[]) {
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


    private byteDeclaration(b: Byteable): TagSeq {
        if (b.getLength() === 0) {
            throw Error("not entirely sure how to declare zero bytes");
        }
        let kw: Tag = ['kw', DefaultDialect.KW_BYTE_DECLARATION];
        return [kw, ["hexarray", b.getBytes().map(this.hexByteText).join(", ")]];
    }

    private wordDeclaration(words: number[]): TagSeq {
        let kw: Tag = ['kw', DefaultDialect.KW_WORD_DECLARATION];
        return [kw, ["hexarray", words.map(this.hexWordText).join(", ")]];
    }

    private hexByteText(b: number) {
        return "$" + hex8(b);
    }

    private hexWordText(x:number) {
        return "$" + hex16(x);
    }

    /**
     * Returns only the operand portion, trimmed.
     * Currently, only supports hex literals for operand values;
     * @param il the instruction line
     * @private
     */
    private renderOperand(il: FullInstruction):string {
        const i:Instruction = il.instruction as Instruction;
        const hw = () => "$" + hex16(il.operand16());
        const hb = () => this.hexByteText(il.firstByte);

        let operand = "";
        switch (i.mode) {
            case MODE_ACCUMULATOR:
                // operand = "a";
                operand = ""; // implied accumulator not manifest
                break;
            case MODE_ABSOLUTE:
                operand = hw();
                break;
            case MODE_ABSOLUTE_X:
                operand = hw() + ", x";
                break;
            case MODE_ABSOLUTE_Y:
                operand = hw() + ", y";
                break;
            case MODE_IMMEDIATE:
                operand = "#" + hb();
                break;
            case MODE_IMPLIED:
                operand = "";
                break;
            case MODE_INDIRECT:
                operand = "(" + hw() + ")";
                break;
            case MODE_INDIRECT_X:
                operand = "(" + hb() + ", x)";
                break;
            case MODE_INDIRECT_Y:
                operand = "(" + hb() + "), y";
                break;
            case MODE_RELATIVE:
                // render decimal two's complement 8-bit
                operand = unsignedToSigned(il.firstByte).toString(10);
                break;
            case MODE_ZEROPAGE:
                operand = hb();
                break;
            case MODE_ZEROPAGE_X:
                operand = hb() + ", x"
                break;
            case MODE_ZEROPAGE_Y:
                operand = hb() + ", y"
                break;
        }
        return operand;
    }

    bytes(x: Directive | FullInstructionLine, dis: Disassembler): TagSeq {
        // future: context may give us rules about grouping, pattern detection etc.
        const comments: Tag = ["comment", this.renderComments(x.labelsComments.comments)];
        const labels: Tag = ["label", this.renderLabels(x.labelsComments.labels)];
        const data:Tag = ["data", this._env.indent() + tagText(this.byteDeclaration(x))];
        return [comments, labels, data];
    }

    words(words:number[], lc:LabelsComments, dis: Disassembler): TagSeq {
        const comments: Tag = ["comment", this.renderComments(lc.comments)];
        const labels: Tag = ["label", this.renderLabels(lc.labels)];
        const tags:TagSeq = this.wordDeclaration(words)
        const data:Tag = ["data", this._env.indent() + tagText(tags)];
        return [comments, labels, data];
    }

    code(fil: FullInstructionLine, dis: Disassembler): TagSeq {
        const comments: Tag = ["comment", this.renderComments(fil.labelsComments.comments)];
        const labels: Tag = ["label", this.renderLabels(fil.labelsComments.labels)];
        const instruction = fil.fullInstruction.instruction as Instruction;
        return [comments, labels].concat(this.taggedCode(instruction, fil));
    }

    directive(directive: Directive, dis: Disassembler): TagSeq {
        TODO();
        return [];
    }

    pcAssign(pcAssign: PcAssign, dis: Disassembler): TagSeq {
        const comments: Tag = ["comment", this.renderComments(pcAssign.labelsComments.comments)];
        const labels: Tag = ["label", this.renderLabels(pcAssign.labelsComments.labels)];
        const base = this.hexWordText(pcAssign.address);
        return [comments, labels, ["addr", "_  "], ["code", "* ="], ["abs opnd", base]];
    }

}

/** Has a byte correspondence */
interface Byteable {
    /** The possibly empty array of byte values. */
    getBytes(): number[];
    /** Length in bytes, must not be negative. */
    getLength(): number;
}

/**
 * Assembler directive. Has a source form, may produce bytes during assembly and may be synthesised during
 * disassembly, but does not necessarily correspond to machine instructions and may not even produce code output.
 */
interface Directive extends Instructionish {

    // other properties expected to emerge when trying to synthesise stuff like symbol assignment

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
    get sourceType():SourceType;
}

/**
 * A representation of a specific instruction on a line in a source file with its
 * operands, potential labels, potential comments etc.
 */
class FullInstructionLine extends InstructionBase {
    private readonly _fullInstruction: FullInstruction;

    constructor(fullInstruction: FullInstruction, lc:LabelsComments) {
        super(lc);
        this._fullInstruction = fullInstruction;
    }

    get fullInstruction(): FullInstruction {
        return this._fullInstruction;
    }

    getBytes(): number[] {
        return this._fullInstruction.getBytes();
    }

    getLength(): number {
        return this._fullInstruction.getLength();
    }

    disassemble(dialect: Dialect, dis: Disassembler): TagSeq {
        return dialect.code(this, dis);
    }

    get sourceType(): SourceType {
        return SourceType.MACHINE;
    }
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

/**
 * Metadata valuable for disassembling a {@link FileBlob}. Expect this interface to evolve dramatically.
 */
interface DisassemblyMeta {
    /**
     * The address the file should be loaded into. Some images may have multiple segments loaded into
     * different addresses and some file formats accommodate this.
     * @param fb the file to get the vector from
     */
    baseAddress(fb: FileBlob): number;

    /**
     * The byte offset at which the cold reset vector resides.
     */
    get resetVectorOffset(): number;

    /**
     * The byte offset at which the nmi reset vector resides.
     */
    get nmiVectorOffset(): number;

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
     * Gets the precept defined for the given offset if one is defined.
     *
     * @param offset
     */
    getPrecept(offset:number):Precept | undefined;

    /**
     * Return a list of address + LabelsComments
     */
    get jumpTargets(): [Address, LabelsComments][];
}

class ByteDefinitionPrecept implements Precept {
    private readonly _offset: number;
    private readonly numBytes: number;
    protected readonly lc: LabelsComments;

    constructor(offset: number, length: number, lc:LabelsComments) {
        this._offset = offset;
        this.numBytes = length;
        this.lc = lc;
    }

    create(fb: FileBlob): Instructionish {
        const bytes = fb.bytes.slice(this.offset, this.offset + this.length);
        return new ByteDeclaration(Array.from(bytes), this.lc);
    }

    get length(): number {
        return this.numBytes;
    }

    get offset(): number {
        return this._offset;
    }
}

/**
 * Declares an address definition using the bytes at the offset.
 */
class VectorDefinitionPrecept extends ByteDefinitionPrecept {

    constructor(offset: number, lc: LabelsComments) {
        super(offset, 2, lc); // 2 bytes in a word
    }

    create(fb: FileBlob): Instructionish {
        const firstByte = fb.bytes.at(this.offset);
        const secondByte = fb.bytes.at(this.offset+1);
        if (firstByte !== undefined && secondByte !== undefined) {
            return new WordDefinition(firstByte, secondByte, this.lc);
        } else {
            throw Error(`Can't read word from FileBlob ${fb.name} at offset ${this.offset} `);
        }
    }
}

const mkLabels = (labels:string[] | string) => new LabelsComments(labels);
const mkComments = (comments:string[] | string) => new LabelsComments([], comments);

export class LabelsComments {
    private readonly _labels: string[];
    private readonly _comments: string[];

    static EMPTY = new LabelsComments();

    constructor(labels:string[] | string = [], comments: string[] | string = []) {
        this._labels = ((typeof labels === "string") ? [labels] : labels).filter(s => s.length > 0);
        this._comments = ((typeof comments === "string") ? [comments] : comments).filter(s => s.length > 0);
    }

    get labels() {
        return this._labels
    }
    get comments() {
        return this._comments;
    }
}

class DisassemblyMetaImpl implements DisassemblyMeta {

    /** A bit stinky - should never be used and probably not exist. */
    static NULL_DISSASSEMBLY_META = new DisassemblyMetaImpl(0, 0, 0, 0, [], []);

    private readonly _baseAddressOffset: number;
    private readonly _resetVectorOffset: number;
    private readonly _nmiVectorOffset: number;
    private readonly _contentStartOffset: number;
    private readonly precepts: { [id: number] : Precept; };
    private readonly _jumpTargets: [Address, LabelsComments][];

    constructor(
        baseAddressOffset: number,
        resetVectorOffset: number,
        nmiVectorOffset: number,
        contentStartOffset: number,
        precepts: Precept[],
        jumpTargets: [Address, LabelsComments][] = [],
        ) {

        this._baseAddressOffset = baseAddressOffset;
        this._contentStartOffset = contentStartOffset;

        // keep the offsets
        this._resetVectorOffset = resetVectorOffset;
        this._nmiVectorOffset = nmiVectorOffset;
        this.precepts = {};
        for (let i = 0; i < precepts.length; i++) {
            const precept = precepts[i];
            this.precepts[precept.offset] = precept;
        }
        this._jumpTargets = jumpTargets;
    }

    baseAddress(fb: FileBlob): number {
        return fb.readVector(this._baseAddressOffset);
    }

    get resetVectorOffset(): number {
        return this._resetVectorOffset;
    }

    get nmiVectorOffset(): number {
        return this._nmiVectorOffset;
    }

    contentStartOffset(): number {
        return this._contentStartOffset;
    }

    disassemblyStartOffset(fb: FileBlob): number {
        // currently a crude guess
        const resetAddr = fb.readVector(this._resetVectorOffset);
        // two bytes make an address
        const resetMsb = resetAddr + 1;
        const resetVectorIsInBinary = this.inBinary(resetMsb, fb);
        if (resetVectorIsInBinary) {
            return resetAddr - fb.readVector(this._baseAddressOffset);
        } else {
            // reset vector is outside binary, so start disassembly at content start?
            console.warn(`reset vector is outside binary ($${hex16(resetAddr)})`);
            return this.contentStartOffset();
        }
    }

    private inBinary(addr: number, fb: FileBlob) {
        const base = this.baseAddress(fb);
        return addr >= base && addr <= base + fb.size;
    }

    getPrecept(address: number): Precept | undefined {
        return this.precepts[address];
    }

    get jumpTargets(): [Address, LabelsComments][] {
        return this._jumpTargets;
    }
}

/**
 * Rule for specifying the disassembly of a sequence of bytes at a binary offset. File formats or
 * user demand can require that a location be interpreted as code or a labeled address definition etc.
 */
interface Precept {

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
    create(fb:FileBlob): Instructionish;
}

/** Stateful translator of bytes to their parsed instruction line */
class Disassembler {
    private iset: InstructionSet;
    originalIndex: number;
    currentIndex: number;
    fb: FileBlob;
    private readonly segmentBaseAddress: number;

    /**
     * Tuple: label, address
     */
    private labels: [string, number][];

    private disMeta: DisassemblyMeta;

    constructor(iset: InstructionSet, fb: FileBlob, dm: DisassemblyMeta) {
        this.iset = iset;
        let index = dm.contentStartOffset();
        let bytes = fb.bytes;
        if (index >= bytes.length || index < 0) {
            throw Error("index out of range");
        }
        this.originalIndex = index;
        this.currentIndex = index;
        this.fb = fb;
        this.segmentBaseAddress = dm.baseAddress(fb);

        // TODO put these in the cart definition?
        const resetVector = fb.readVector(dm.resetVectorOffset);
        const nmiVector = fb.readVector(dm.nmiVectorOffset);
        this.labels = [["handleReset", resetVector], ["handleNmi", nmiVector]];

        this.disMeta = dm;
    }

    private eatBytes(count: number): number[] {
        const bytes: number[] = [];
        for (let i = 1; i <= count; i++) {
            bytes.push(this.eatByte());
        }
        return bytes;
    }

    private eatByteOrDie() {
        if (this.currentIndex >= this.fb.bytes.length) {
            throw Error("No more bytes");
        }
        return this.eatByte();
    }

    private eatByte() {
        const value = this.fb.bytes.at(this.currentIndex++);
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
    nextInstructionLine():Instructionish {
        let labels: Array<string> = [];
        // need to allow multiple labels
        if (this.needsLabel(this.currentAddress)) {
            labels = this.generateLabels(this.currentAddress)
        }
        let comments: Array<string> = [];
        if (this.needsComment(this.currentAddress)) {
            comments = this.generateComments(this.currentAddress);
        }
        const precept = this.disMeta.getPrecept(this.currentIndex);
        if (precept !== undefined) {
            this.currentIndex += precept.length;
            return precept.create(this.fb);
        }

        const opcode = this.eatByteOrDie();

        const numInstructionBytes = Mos6502.INSTRUCTIONS.numBytes(opcode) || 1;
        if (Mos6502.INSTRUCTIONS.op(opcode) === undefined) {
            return new ByteDeclaration([opcode], mkComments("illegal opcode"));
        }
        // if there are not enough bytes for this whole instruction, return a ByteDeclaration for the remaining bytes
        let remainingBytes = this.fb.bytes.length - this.currentIndex;

        if (remainingBytes < numInstructionBytes) {
            let bytes = [opcode].concat(this.eatBytes(remainingBytes))
            return new ByteDeclaration(bytes, mkComments("must be data?"));
        } else {
            const preceptAhead = (n:number) => this.disMeta.getPrecept(this.currentIndex + n) !== undefined;
            // current index is the byte following the opcode which we've already checked for a precept
            // check there is no precept inside the bytes this instruction would need
            if (numInstructionBytes === 2 && preceptAhead(1)){
                return new ByteDeclaration([opcode], mkComments("inferred via precept+1"));
            } else if (numInstructionBytes === 3) {
              if (preceptAhead(2)) {
                  const bytes = [opcode, this.eatByte()];
                  return new ByteDeclaration(bytes, mkComments("inferred via precept+2"));
              } else if (preceptAhead(3)) {
                  const bytes = [opcode, this.eatByte(), this.eatByte()];
                  return new ByteDeclaration(bytes, mkComments("inferred via precept+3"));
              }
            }

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
            return new FullInstructionLine(il, new LabelsComments(labels, comments));
        }
    }

    hasNext() {
        return this.currentIndex < this.fb.bytes.length;
    }

    needsLabel = (addr: number) => {
        return typeof this.labels.find(t => t[1] === addr) !== "undefined";
    };

    /** Returns zero or more labels that belong at the given addres. */
    generateLabels = (addr: number) => this.labels.filter(t => t[1] === addr).map(t => t[0]);

    /**
     * Returns zero or more comments that belong at the given address.
     */
    generateComments = (a: number) => this.jumpTargets().filter(x => x === a).map(x => `called from ${hex16(x)}`);

    /**
     * Determine all jump targets both statically defined and implied by the given sequence of instructions. Only
     * those targets that lie within our address range are returned.
     */
    private jumpTargets = (instructions:FullInstruction[] = []): number[] => {
        // collect reset vector and nmi vector as jump targets
        const nmi = this.fb.readVector(this.disMeta.nmiVectorOffset);
        const reset = this.fb.readVector(this.disMeta.resetVectorOffset);
        const jumps = instructions.filter(inst => inst.instruction.op.isJump).map(fi => fi.operand16());
        // for all jump instructions, collect the destination address
        const allJumpTargets = [nmi, reset, ...jumps];
        // for all such addresses, filter those in range of the loaded binary
        return allJumpTargets.filter(this.addressInRange);
    };

    private addressInRange = (addr:number): boolean => {
        const notTooLow = addr >= this.segmentBaseAddress;
        const notTooHigh = addr <= this.segmentBaseAddress + this.fb.size - this.disMeta.contentStartOffset();
        return notTooLow && notTooHigh;
    };

    needsComment = (addr: number) => this.generateComments(addr).length === 0;

    get currentAddress(): number {
        return this.segmentBaseAddress + this.currentIndex - this.originalIndex;
    }
}

const hexDumper: (fb: FileBlob) => UserAction = (fb: FileBlob) => ({
    label: "Hex Dump",
    f: () => {
        const elements:TagSeq = Array.from(fb.bytes).map(x=> ["hexbyte", hex8(x)]);
        return new Detail(["hexbytes"], [elements]);
    }
});

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

    getDisassemblyMeta(): DisassemblyMeta;

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

    getDisassemblyMeta(): DisassemblyMeta {
        return this.dm;
    }

    dataMatch(fileBlob: FileBlob) {
        return fileBlob.submatch(this.prefix, 0);
    }

    sniff(fb: FileBlob): number {
        return (this.dataMatch(fb) ? 2 : 0.5) * (this.extensionMatch(fb) ? 1.5 : 0.9);
    }
}

const UNKNOWN_BLOB = new BlobType("unknown", "type not detected", []);

export {
    BlobType,
    BooBoo,
    DefaultDialect,
    Disassembler,
    DisassemblyMetaImpl,
    Environment,
    FullInstructionLine,
    hexDumper,
    PcAssign,
    Section,
    SectionType,
    tagText,
    UNKNOWN_BLOB,
    ByteDefinitionPrecept,
    VectorDefinitionPrecept,
    mkLabels,
    mkComments,
};
export type {
    BlobSniffer,
    Tag,
    TagSeq,
    DisassemblyMeta,
    BlobToActions,
    Byteable,
    Instructionish,
    Dialect,
    Directive,
    Precept,
    Address
};