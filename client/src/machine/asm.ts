// assembler / disassembler stuff

import {assertByte, hex16, hex8} from "../misc/BinUtils";
import {FileBlob} from "./FileBlob";
import {
    Instruction,
    InstructionLike,
    InstructionSet,
    InstructionWithOperands,
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
import {Detail, UserAction} from "./revenge";
import {spacecat, stringcat} from "../misc/fp";

export {}
export {Disassembler};
export {Environment};
export {FullInstructionLine};
export {DefaultDialect};

/** Assembler pseudo-op that reserves literal bytes. */
export class ByteDeclaration implements InstructionLike {

    private readonly _rawBytes: Array<number>;

    constructor(rawBytes: Array<number>) {
        this._rawBytes = rawBytes.map(b => assertByte(b));
    }

    handleCode(fn: (i: Instruction) => void) {
        // do not run the function
    }

    handleData(fn: (il: InstructionLike) => void) {
        fn(this);
    }

    get rawBytes(): Array<number> {
        return this._rawBytes;
    }

    get numBytes(): number {
        return this._rawBytes.length;
    }
}

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
    validateLabel(label: String): BooBoo[];

    /**
     * Return the characters that go before a line comment.
     */
    commentPrefix(): string;

    /**
     * Format the given string as a label. For example adding a trailing colon that must be present but which
     * is not part of the label name.
     * @param s
     */
    labelFormat(s: string): string;
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

type Tag = [string,string]
type TagSeq = Tag[]

/**
 * Turns a tagSeq into plain text, discarding the tags.
 * @param ts
 */
const tagText = (ts:TagSeq) => ts.map(t=>t[1]).reduce(spacecat, "");

/**
 * Need to support options, possibly at specific memory locations.
 * Global option may be lowercase opcodes.
 * Location-specific option might be arbitrary label, decimal operand, lo-byte selector "<" etc.
 * Some assembler dialects have other ways of rendering addressing modes (e.g suffix on mnemonic).
 * Can support use of symbols instead of numbers - user may prefer to autolabel kernal addresses.
 */
class DefaultDialect implements Dialect {
    private readonly _env: Environment;

    private static readonly KW_BYTE_DECLARATION: string = '.byte';

    get name(): string {
        return "Default Dialect";
    }

    get env(): Environment {
        return this._env;
    }

    constructor(env: Environment) {
        this._env = env;
    }

    validateLabel(l: String): BooBoo[] {
        // future: some assemblers insist labels must not equal/start-with/contain a mnemonic
        const regExpMatchArrays = l.matchAll(/(^\d|\s)/g);
        if (regExpMatchArrays) {
            return [new BooBoo(`Label must not start with digit or contain whitespace: ${l}`)];
        } else {
            return [];
        }
    }

    /**
     * Parse input from index offset characters in until end of line or end of input,
     * whichever's first but the index must be inside the range of the string's chars.
     * Interpret mnemonic syntax of our assembly dialect and return a datastructure
     * of properties for that machine instruction, including operands and expected
     * runtime in clock cycles. TODO : what datastructure, smartypants?
     * @param input
     * @param index
     */
    assemble(input: string, index: number) {
        if (index >= input.length || index < 0) {
            throw Error("index out of range")
        }
        throw Error("not implemented");
        // parsing can fail if wrong or not enough bytes

        // return Instruction + 0-2 bytes operand + new index (this may be beyond input which means finished)
        // or possibly return pseudo op
        // return value could also contain input offset, length, maybe metadata for comment etc.
    }

    private taggedCode(mi: Instruction, fil: FullInstructionLine):TagSeq {
        // add the mnemonic tag and also the mnemonic category
        const mnemonic:Tag = [`mn ${mi.op.cat}`, mi.op.mnemonic.toLowerCase()];
        const operand:Tag = [`opnd ${mi.mode}`, this.renderOperand(fil.instructionLine)];
        return [mnemonic, operand];
    }

    private renderData(il: InstructionLike) {
        return this._env.indent() + tagText(this.byteDeclaration(il));
    }

    private renderLabels(fil: FullInstructionLine) {
        const le = this._env.targetLineEndings();
        return fil.labels.map(s => this.labelFormat(s) + le).reduce(stringcat, "");
    }

    private renderComments(fil: FullInstructionLine) {
        const le = this._env.targetLineEndings();
        return fil.comments.map(c => this.commentPrefix() + c.replaceAll(le, le + this.commentPrefix())).reduce(stringcat, "");
    }

    commentPrefix() {
        return "; ";
    }

    labelFormat(s: string) {
        return s + ": ";
    }

    private byteDeclaration(il: InstructionLike):TagSeq {
        let kw:Tag = ['kw', DefaultDialect.KW_BYTE_DECLARATION];
        let s2 = "";
        il.rawBytes.forEach((b, i) => {
            if (i !== 0) {
                s2 += ", ";
            }
            s2 += this.hexByteText(b);
        });
        return [kw, ["hexarray", s2]];
    }

    private hexByteText(b: number) {
        return "$" + hex8(b);
    }

    /**
     * Returns the given instruction as text.
     * @param fil
     */
    text(fil: FullInstructionLine) {
        // treating comments as prefix full-lines is simpler than end of line comments
        const le = this._env.targetLineEndings();
        // concat strings / flatten whatever
        let comments = this.renderComments(fil);
        // in this dialect, labels have their own line and end with colon
        let labels = this.renderLabels(fil);
        let i: InstructionLike = fil.instructionLine.instruction;

        let codeOrData = "";
        // NOTE: trying out weird extreme avoidance of casting:
        // TODO stop the madness, this experiment failed
        i.handleCode(mi => {
            codeOrData = this._env.indent() + tagText(this.taggedCode(mi, fil));
        });
        i.handleData(il => {
            codeOrData = this.renderData(il);
        });

        return comments + labels + codeOrData;
    }

    /** Returns the given instruction as TagSeq elements in lexical order */
    tagged(fil: FullInstructionLine):TagSeq {
        const comments:Tag = ["comment", this.renderComments(fil)];
        const labels:Tag = ["label", this.renderLabels(fil)];
        let i: InstructionLike = fil.instructionLine.instruction

        let tagged:TagSeq = [comments, labels];
        i.handleCode(mi => {
            tagged = tagged.concat(this.taggedCode(mi, fil));
        });
        i.handleData(il => {
            tagged.push(["data", this.renderData(il)]);
        });
        return tagged;
    }

    /**
     * Returns only the operand portion, trimmed.
     * Currently, only supports hex literals for operand values;
     * @param il the instruction line
     * @private
     */
    private renderOperand(il: InstructionWithOperands) {
        const i = il.instruction as Instruction;    // TODO get rid of cast
        const mode = i.mode;

        let operand = "";
        switch (mode) {
            case MODE_ACCUMULATOR:
                operand = "a";
                break;
            case MODE_ABSOLUTE:
                operand = "$" + hex16(il.operand16());
                break;
            case MODE_ABSOLUTE_X:
                operand = "$" + hex16(il.operand16()) + ", x";
                break;
            case MODE_ABSOLUTE_Y:
                operand = "$" + hex16(il.operand16()) + ", y";
                break;
            case MODE_IMMEDIATE:
                operand = "#$" + hex8(il.firstByte);
                break;
            case MODE_IMPLIED:
                operand = "";
                break;
            case MODE_INDIRECT:
                operand = "($" + hex16(il.operand16()) + ")";
                break;
            case MODE_INDIRECT_X:
                operand = "($" + hex8(il.firstByte) + ", x)";
                break;
            case MODE_INDIRECT_Y:
                operand = "($" + hex8(il.firstByte) + "), y";
                break;
            case MODE_RELATIVE:
                // TODO can be negative byte, maybe render decimal
                operand = "$" + hex8(il.firstByte);
                break;
            case MODE_ZEROPAGE:
                operand = "$" + hex8(il.firstByte);
                break;
            case MODE_ZEROPAGE_X:
                operand = "$" + hex8(il.firstByte) + ", x"
                break;
            case MODE_ZEROPAGE_Y:
                operand = "$" + hex8(il.firstByte) + ", y"
                break;
        }
        return operand;
    }

}

/**
 * A representation of a specific instruction on a line in a source file with its
 * operands, potential labels, potential comments etc.
 */
class FullInstructionLine {
    private readonly _labels: Array<string>;
    private readonly _instructionLine: InstructionWithOperands;
    private readonly _comments: Array<string>;

    constructor(labels: Array<string>, instructionLine: InstructionWithOperands, comments: Array<string>) {
        this._labels = labels;
        this._instructionLine = instructionLine;
        this._comments = comments;
    }

    get labels(): Array<string> {
        return this._labels;
    }

    get instructionLine(): InstructionWithOperands {
        return this._instructionLine;
    }

    get comments(): Array<string> {
        return this._comments;
    }

    asHex() {
        const hInst = hex8(this._instructionLine.instruction.rawBytes[0]);

        if (this._instructionLine.instruction.numBytes === 1) {
            return hInst;
        }
        if (this._instructionLine.instruction.numBytes === 2) {
            return `${hInst} ${hex8(this._instructionLine.firstByte)}`
        }
        if (this._instructionLine.instruction.numBytes === 3) {
            return `${hInst} ${hex8(this._instructionLine.firstByte)} ${hex8(this._instructionLine.secondByte)}`;
        }
        // must be a data declaration because it takes more than 3 bytes
        return this._instructionLine.instruction.rawBytes.map(hex8).reduce((p, c) => (`${p} ${c}`));

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

/** Will have different types of data later (petscii, sid music, character) */
enum SegmentType {
    CODE, DATA
}

class Segment {
    segmentType: SegmentType;
    startOffset: number;
    length: number;

    constructor(segmentType: SegmentType, startOffset: number, length: number) {
        this.segmentType = segmentType;
        this.startOffset = startOffset;
        this.length = length;
    }
}

/**
 * Metadata valuable for disassembling a FileBlob.
 */
interface DisassemblyMeta {
    /**
     * The address the file should be loaded into. Some images may have multiple segments loaded into
     * different addresses and some file formats accommodate this.
     * @param fb the file to get the vector from
     */
    baseAddress(fb: FileBlob): number;

    /**
     * Address of start of code for a cold boot.
     * @param fb the file to get the vector from
     */
    coldResetVector(fb: FileBlob): number;

    /**
     * Address of start of code for a warm boot.
     * @param fb the file to get the vector from
     */
    warmResetVector(fb: FileBlob): number;

    /**
     * temporary until we implemnet segments
     * Address of start of code for a warm boot; i.e. when RESTORE is hit (?)
     * @param fileBlob
     */
    disassemblyStartIndex(fb: FileBlob): number;

    contentStartIndex(fb: FileBlob): number;
}

export class NullDisassemblyMeta implements DisassemblyMeta {

    static INSTANCE = new NullDisassemblyMeta();

    private constructor() {
        // intentionally left blank
    }

    baseAddress(fb: FileBlob): number {
        return 0;
    }

    coldResetVector(fb: FileBlob): number {
        return 0;
    }

    contentStartIndex(fb: FileBlob): number {
        return 0;
    }

    disassemblyStartIndex(fb: FileBlob): number {
        return 0;
    }

    warmResetVector(fb: FileBlob): number {
        return 0;
    }

}

class DisassemblyMetaImpl implements DisassemblyMeta {
    private readonly _baseAddressOffset: number;
    private readonly _resetVectorOffset: number;
    private readonly _nmiVectorOffset: number;
    private readonly _contentStartOffset: number;

    constructor(baseAddressOffset:number, resetVectorOffset:number, nmiVectorOffset:number, contentStartOffset:number) {
        this._baseAddressOffset = baseAddressOffset;
        this._resetVectorOffset = resetVectorOffset;
        this._nmiVectorOffset = nmiVectorOffset;
        this._contentStartOffset = contentStartOffset;
    }

    baseAddress(fb: FileBlob): number {
        return fb.readVector(this._baseAddressOffset);
    }

    coldResetVector(fb: FileBlob): number {
        return fb.readVector(this._resetVectorOffset);
    }

    contentStartIndex(fb: FileBlob): number {
        return this._contentStartOffset;
    }

    disassemblyStartIndex(fb: FileBlob): number {
        return this.coldResetVector(fb) - this.baseAddress(fb)
    }

    warmResetVector(fb: FileBlob): number {
        return fb.readVector(this._nmiVectorOffset);
    }

}

/** Stateful translator of bytes to their parsed instruction line */
class Disassembler {

    originalIndex: number;
    currentIndex: number;
    fb: FileBlob;
    private _currentAddress: number;

    labels: [string, number][];

    private disMeta: DisassemblyMeta;

    constructor(iset: InstructionSet, fb: FileBlob, type: DisassemblyMeta) {
        this.iset = iset;
        let index = type.contentStartIndex(fb);
        console.log(`starting disassembly at index ${index}`);
        let bytes = fb.bytes;
        if (index >= bytes.length || index < 0) {
            throw Error("index out of range");
        }
        this.originalIndex = index;
        this.currentIndex = index;
        this.fb = fb;
        this._currentAddress = type.baseAddress(fb);
        this.labels = [["handleReset", type.coldResetVector(fb)], ["handleNmi", type.warmResetVector(fb)]];
        this.disMeta = type;
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

    nextInstructionLine() {
        let labels: Array<string> = [];
        // need to allow multiple labels
        if (this.needsLabel(this.currentAddress)) {
            labels = this.generateLabels(this.currentAddress)
        }
        let comments: Array<string> = [];
        if (this.needsComment(this.currentAddress)) {
            comments = this.generateComments(this.currentAddress);
        }

        // TODO somehow move the driving details into the BlobSniffer:
        if (this.currentIndex === 0) {
            console.log("manually handling base address");
            const bd = new ByteDeclaration(this.eatBytes(2));
            return new FullInstructionLine(["cartBase"], new InstructionWithOperands(bd, 0, 0), []);
        }
        if (this.currentIndex === 2) {
            console.log("manually handling reset vector");
            const bd = new ByteDeclaration(this.eatBytes(2));
            return new FullInstructionLine(["resetVector"], new InstructionWithOperands(bd, 0, 0), []);
        }
        if (this.currentIndex === 4) {
            console.log("manually handling nmi vector");
            const bd = new ByteDeclaration(this.eatBytes(2));
            return new FullInstructionLine(["nmiVector"], new InstructionWithOperands(bd, 0, 0), []);
        }
        if (this.currentIndex === 6) {
            console.log("manually handling cart magic");
            const bd = new ByteDeclaration(this.eatBytes(5));
            return new FullInstructionLine(["cartSig"], new InstructionWithOperands(bd, 0, 0), []);
        }
        if (this.currentIndex < 11) {
            throw Error("well this is unexpected!");
        }

        const opcode = this.eatByteOrDie();
        const numInstructionBytes = Mos6502.INSTRUCTIONS.numBytes(opcode) || 1;

        // if the instruction doesn't define an operand byte, its value is not guaranteed to be defined

        // if there are not enough bytes, return a ByteDeclaration for the remaining bytes
        let remainingBytes = this.fb.bytes.length - this.currentIndex;

        if (remainingBytes <= 0) {
            let bytes = [opcode]
            for (let i = 0; i < remainingBytes; i++) {
                bytes.push(this.currentIndex++);
            }
            const bd = new ByteDeclaration(bytes);
            return new FullInstructionLine(labels, new InstructionWithOperands(bd, 0, 0), comments);
        } else {
            let firstOperandByte = 0;
            let secondOperandByte = 0;
            if (numInstructionBytes > 1) {
                firstOperandByte = this.eatByteOrDie();
            }
            if (numInstructionBytes === 3) {
                secondOperandByte = this.eatByteOrDie();
            }

            const il = new InstructionWithOperands(this.iset.instruction(opcode), firstOperandByte, secondOperandByte);
            return new FullInstructionLine(labels, il, comments);
        }
    }

    hasNext() {
        return this.currentIndex < this.fb.bytes.length;
    }

    needsLabel = (addr: number) => {
        return typeof this.labels.find(t => t[1] === addr) !== "undefined";
    };

    generateLabels = (addr: number) => this.labels.filter(t => t[1] === addr).map(t => t[0]);

    needsComment = (addr: number) => false;
    private iset: InstructionSet;
    generateComments = (addr: number) => [];

    get currentAddress(): number {
        // may not always be this because it can be assigned by assembler directive in source
        return this._currentAddress + this.currentIndex - this.originalIndex;
    }
}

const hexDumper: UserAction = {
    label: "Hex Dump",
    f: () => {
        // TODO get hold of the bytes so the following can replace the special case of hexdumping
        return new Detail(["hexbyte"], [[["hex", "ff"]]]);
    }
};

export {hexDumper, BooBoo, tagText, DisassemblyMetaImpl}
export type {Tag, TagSeq, DisassemblyMeta}

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
        this.dm = dm ? dm : NullDisassemblyMeta.INSTANCE;
        this.exts = ext ? [ext] : [];
        this.tags = tags;
        this.prefix = prefix ? new Uint8Array(prefix) : new Uint8Array(0);
    }

    extensionMatch(fb: FileBlob) {
        const filename = fb.name;
        return this.exts.reduce((a, n) => a || filename.toLowerCase().endsWith("." + n), false);
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
const UNKNOWN = new BlobType("unknown", "type not detected", []);

export {BlobType, UNKNOWN};
export type {BlobSniffer};