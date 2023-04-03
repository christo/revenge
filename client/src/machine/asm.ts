// assembler / disassembler stuff - 6502-specific

import {Address, assertByte, Byteable, hex16, hex8, toArray, TODO, unToSigned} from "./core";
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
import {BooBoo, Tag, TagSeq} from "./api";

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
    /** Label definition */
    LABEL,
    /** Something for the humans */
    COMMENT,
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

    private taggedCode(mi: Instruction, fil: FullInstructionLine): TagSeq {
        // add the mnemonic tag and also the mnemonic category
        const mnemonic: Tag = new Tag(mi.op.mnemonic.toLowerCase(), `mn ${mi.op.cat}`);
        const operandText = this.renderOperand(fil.fullInstruction).trim();
        if (operandText.length > 0) {
            return [mnemonic, new Tag(operandText, `opnd ${mi.mode.code}`)];
        } else {
            return [mnemonic];
        }
    }

    private renderLabels(labels: string[]) {
        const le = this._env.targetLineEndings();
        return labels.map(s => this.formatLabel(s)).join(le);
    }

    private renderComments(comments: string[]) {
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
     * @param il the instruction line
     * @private
     */
    private renderOperand(il: FullInstruction): string {
        const hw = () => "$" + hex16(il.operand16());
        const hb = () => this.hexByteText(il.firstByte);

        let operand = "";
        switch (il.instruction.mode) {
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
                operand = unToSigned(il.firstByte).toString(10);
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

    bytes(x: FullInstructionLine, dis: Disassembler): TagSeq {
        // future: context may give us rules about grouping, pattern detection etc.
        const comments: Tag = new Tag(this.renderComments(x.labelsComments.comments), "comment");
        const labels: Tag = new Tag(this.renderLabels(x.labelsComments.labels), "label");
        const data: Tag = new Tag(this._env.indent() + tagText(this.byteDeclaration(x)), "data");
        return [comments, labels, data];
    }

    words(words: number[], lc: LabelsComments, dis: Disassembler): TagSeq {
        const comments: Tag = new Tag(this.renderComments(lc.comments), "comment");
        const labels: Tag = new Tag(this.renderLabels(lc.labels), "label");
        const tags: TagSeq = this.wordDeclaration(words)
        const data: Tag = new Tag(this._env.indent() + tagText(tags), "data");
        return [comments, labels, data];
    }

    code(fil: FullInstructionLine, dis: Disassembler): TagSeq {
        const comments: Tag = new Tag(this.renderComments(fil.labelsComments.comments), "comment");
        const labels: Tag = new Tag(this.renderLabels(fil.labelsComments.labels), "label");
        return [comments, labels, ...this.taggedCode(fil.fullInstruction.instruction, fil)];
    }

    directive(directive: Directive, dis: Disassembler): TagSeq {
        TODO();
        return [];
    }

    pcAssign(pcAssign: PcAssign, dis: Disassembler): TagSeq {
        const comments = new Tag(this.renderComments(pcAssign.labelsComments.comments), "comment");
        const labels = new Tag(this.renderLabels(pcAssign.labelsComments.labels), "label");
        const pc = new Tag("* =", "code");
        const addr = new Tag(this.hexWordText(pcAssign.address), ["abs", "opnd"]);
        const dummy = new Tag("_", "addr");
        return [comments, labels, dummy, pc, addr];
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
class VectorDefinitionEdict extends ByteDefinitionEdict {

    constructor(offset: number, lc: LabelsComments) {
        super(offset, 2, lc); // 2 bytes in a word
    }

    create(fb: FileBlob): Instructionish {
        const firstByte = fb.bytes.at(this.offset);
        const secondByte = fb.bytes.at(this.offset + 1);
        if (firstByte !== undefined && secondByte !== undefined) {
            return new WordDefinition(firstByte, secondByte, this.lc);
        } else {
            throw Error(`Can't read word from FileBlob ${fb.name} at offset ${this.offset} `);
        }
    }
}

const mkLabels = (labels: string[] | string) => new LabelsComments(labels);
const mkComments = (comments: string[] | string) => new LabelsComments([], comments);

export class LabelsComments {
    private readonly _labels: string[];
    private readonly _comments: string[];

    constructor(labels: string[] | string = [], comments: string[] | string = []) {
        this._labels = toArray(labels);
        this._comments = toArray(comments);
    }

    addLabels(labels: string[] | string) {
        toArray(labels).forEach(s => this._labels.push(s));
    }

    addComments(comments: string[] | string) {
        toArray(comments).forEach(s => this._labels.push(s));
    }

    merge(lc:LabelsComments) {
        this.addLabels(lc._labels);
        this.addComments(lc._comments);
    }

    get labels() {
        return this._labels
    }

    get comments() {
        return this._comments;
    }
}

type JumpTargetFetcher = (fb: FileBlob) => [Address, LabelsComments][];

class DisassemblyMetaImpl implements DisassemblyMeta {

    /** A bit stinky - should never be used and probably not exist. */
    static NULL_DISSASSEMBLY_META = new DisassemblyMetaImpl(0, 0, 0, [], (fb) => []);

    private readonly _baseAddressOffset: number;
    private readonly _resetVectorOffset: number;
    private readonly _contentStartOffset: number;
    private readonly edicts: { [id: number]: Edict<Instructionish>; };
    private readonly jumpTargetFetcher: JumpTargetFetcher;

    constructor(
        baseAddressOffset: number,
        resetVectorOffset: number,
        contentStartOffset: number,
        edicts: Edict<Instructionish>[],
        getJumpTargets: JumpTargetFetcher,
    ) {

        this._baseAddressOffset = baseAddressOffset;
        this._contentStartOffset = contentStartOffset;

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
        return fb.readVector(this._baseAddressOffset);
    }

    contentStartOffset(): number {
        return this._contentStartOffset;
    }

    disassemblyStartOffset(fb: FileBlob): number {
        const resetAddr = fb.readVector(this._resetVectorOffset);
        // two bytes make an address
        const resetMsb = resetAddr + 1;
        const resetVectorIsInBinary = this.inBinary(resetMsb, fb);
        if (resetVectorIsInBinary) {
            return resetAddr - fb.readVector(this._baseAddressOffset);
        } else {
            // reset vector is outside binary, so start disassembly at content start?
            console.log(`reset vector is outside binary ($${hex16(resetAddr)})`);
            return this.contentStartOffset();
        }
    }

    private inBinary(addr: number, fb: FileBlob) {
        const base = this.baseAddress(fb);
        return addr >= base && addr <= base + fb.size;
    }

    getEdict(address: number): Edict<Instructionish> | undefined {
        return this.edicts[address];
    }

    getJumpTargets(fb: FileBlob): [Address, LabelsComments][] {
        return this.jumpTargetFetcher(fb);
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
}

/** Stateful translator of bytes to their parsed instruction line */
class Disassembler {
    private iset: InstructionSet;
    originalIndex: number;
    currentIndex: number;
    fb: FileBlob;
    private readonly segmentBaseAddress: number;

    private predefLc: [Address, LabelsComments][];

    private disMeta: DisassemblyMeta;

    constructor(iset: InstructionSet, fb: FileBlob, bs: BlobSniffer) {
        this.iset = iset;
        const dm = bs.getMeta();
        let index = dm.contentStartOffset();
        let bytes = fb.bytes;
        if (index >= bytes.length || index < 0) {
            throw Error("index out of range");
        }
        this.originalIndex = index;
        this.currentIndex = index;
        this.fb = fb;
        this.segmentBaseAddress = dm.baseAddress(fb);

        this.predefLc = dm.getJumpTargets(fb);

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
    nextInstructionLine(): Instructionish {
        // TODO clean up the early returns
        const lc = this.mkPredefLabelsComments(this.currentAddress);

        const edict = this.disMeta.getEdict(this.currentIndex);
        if (edict !== undefined) {
            this.currentIndex += edict.length;
            return edict.create(this.fb);
        }

        const opcode = this.eatByteOrDie();
        if (Mos6502.INSTRUCTIONS.op(opcode) === undefined) {
            lc.addComments("illegal opcode");
            return new ByteDeclaration([opcode], lc);
        }
        // if there are not enough bytes for this whole instruction, return a ByteDeclaration for the remaining bytes
        // TODO refactor: instruction doesn't fit, via eof or conflicting edict
        let bytesLeft = this.fb.bytes.length - this.currentIndex;
        const instLen = Mos6502.INSTRUCTIONS.numBytes(opcode) || 1;

        if (bytesLeft < instLen) {
            let bytes = [opcode].concat(this.eatBytes(bytesLeft))
            lc.addComments("no more instructions fit");
            return new ByteDeclaration(bytes, lc);
        } else {
            const edictAhead = (n: number) => this.disMeta.getEdict(this.currentIndex + n) !== undefined;
            const mkBd = (n:number) => {
                const bytes = [opcode, ...this.eatBytes(n - 1)];
                lc.addComments(`inferred via edict@+${n}`);
                return new ByteDeclaration(bytes, lc);
            };
            // current index is the byte following the opcode which we've already checked for an edict
            // check for edict inside the bytes this instruction would need
            if (instLen === 2 && edictAhead(1)) {
                return mkBd(1);
            } else if (instLen === 3) {
                if (edictAhead(2)) {
                    return mkBd(2);
                } else if (edictAhead(3)) {
                    return mkBd(3);
                }
            }
            return this.mkInstruction(opcode, lc);
        }
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
        return this.currentIndex < this.fb.bytes.length;
    }

    hasPredefLabel = (addr: Address) => {
        return typeof this.predefLc.find(t => t[0] === addr) !== "undefined";
    };

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
     * Determine all jump targets both statically defined and implied by the given sequence of instructions. Only
     * those targets that lie within the address range of our loaded binary are returned.
     */
    private jumpTargets = (instructions: [Address, FullInstruction][]): Address[] => {
        // collect predefined jump targets
        const fromDm = this.predefLc.map(t => t[0]);
        // collect targets of all current jump instructions
        const dests: Address[] = instructions
            .filter(addrInst => addrInst[1].instruction.op.isJump && addrInst[1].operandAddressResolvable())
            .map(j => j[1].resolveOperandAddress(j[0]));
        // for all jump instructions, collect the destination address
        const allJumpTargets = fromDm.concat(dests);
        // for all such addresses, filter those in range of the loaded binary
        return allJumpTargets.filter(this.addressInRange);
    };

    /**
     * Returns true iff the given address is within the memory range of the currently loaded file.
     *
     * @param addr the address to query.
     */
    private addressInRange = (addr: Address): boolean => {
        const notTooLow = addr >= this.segmentBaseAddress;
        const notTooHigh = addr <= this.segmentBaseAddress + this.fb.size - this.originalIndex;
        return notTooLow && notTooHigh;
    };

    get currentAddress(): Address {
        return this.segmentBaseAddress + this.currentIndex - this.originalIndex;
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
     * file contents and the disassembler who needs to construct the {@link DataView}. Is there a generic
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
    DefaultDialect,
    Disassembler,
    DisassemblyMetaImpl,
    Environment,
    FullInstructionLine,
    PcAssign,
    Section,
    SectionType,
    tagText,
    UNKNOWN_BLOB,
    ByteDefinitionEdict,
    VectorDefinitionEdict,
    mkLabels,
    mkComments
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