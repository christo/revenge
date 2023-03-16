// assembler / disassembler stuff

import {assertByte, hex16, hex8} from "../misc/BinUtils";
import {DisassemblyMeta, FileBlob} from "./FileBlob";
import {
    Instruction,
    InstructionLike,
    InstructionLine,
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
    Mos6502InstructionSet
} from "./mos6502";
import {UserAction} from "./revenge";

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

    ifMachineInstruction(fn: (i: Instruction) => void) {
        // do not run the function
    }

    ifNotMachineInstruction(fn: (il: InstructionLike) => void) {
        fn(this);
    }

    get rawBytes(): Array<number> {
        return this._rawBytes;
    }

    get numBytes(): number {
        return this._rawBytes.length;
    }
}

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
}

/**
 * Error class, all the sensible names have been domain squatted by typescript/javascript.
 *
 */
class BooBoo {
    private mesg: string;

    constructor(mesg: string) {
        this.mesg = mesg;
    }
}

/**
 * Need to support options, possibly at specific memory locations.
 * Global option may be lowercase opcodes.
 * Location-specific option might be arbitrary label, decimal operand, lo-byte selector "<" etc.
 * Some assembler dialects have other ways of rendering addressing modes (e.g suffix on mnemonic).
 * Can support use of symbols instead of numbers - user may prefer to autolabel kernal addresses.
 */
class DefaultDialect implements Dialect {
    private readonly _env: Environment;

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
        // parsing can fail if wrong or not enough bytes

        // return Instruction + 0-2 bytes operand + new index (this may be beyond input which means finished)
        // or possibly return pseudo op
        // return value could also contain input offset, length, maybe metadata for comment etc.
    }

    render(fil: FullInstructionLine) {
        // do full-line comments first, making sure that embedded newlines in comments get line comment prefixes
        // TODO cross-platform line endings
        const le = this._env.targetLineEndings();
        let ccs = (p: string, c: string) => p + c; // concat strings / flatten whatever
        let s = fil.comments.map(c => "; " + c.replaceAll(le, le + "; ")).reduce(ccs, "");
        // in this dialect, labels have their own line and end with colon
        s += fil.labels.map(s => s + ": " + le).reduce(ccs, "");
        let i: InstructionLike = fil.instructionLine.instruction;

        // NOTE: trying out weird extreme avoidance of casting:
        i.ifMachineInstruction(mi => {
            s += this._env.indent() + mi.op.mnemonic.toLowerCase() + " " + this.renderOperand(fil.instructionLine);
        });
        i.ifNotMachineInstruction(il => {
            s += this._env.indent() + `.byte `
            il.rawBytes.forEach((b, i) => {
                if (i !== 0) {
                    s += ", ";
                }
                s += "$" + hex8(b);
            });
        });

        return s;
    }

    /**
     * Returns only the operand portion, trimmed.
     * Currently, only supports hex literals for operand values;
     * @param il the instruction line
     * @private
     */
    private renderOperand(il: InstructionLine) {
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
    private readonly _instructionLine: InstructionLine;
    private readonly _comments: Array<string>;

    constructor(labels: Array<string>, instructionLine: InstructionLine, comments: Array<string>) {
        this._labels = labels;
        this._instructionLine = instructionLine;
        this._comments = comments;
    }

    get labels(): Array<string> {
        return this._labels;
    }

    get instructionLine(): InstructionLine {
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
 * TODO: maybe make this a config tree. (is there a convenient config api?)
 */
class Environment {
    static DEFAULT_ENV = new Environment();

    targetLineEndings() {
        return "\n";
    }

    indent() {
        return "    ";
    }

    // TODO get marked regions

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
        this.labels = [["resetVector", type.coldResetVector(fb)], ["nmiVector", type.warmResetVector(fb)]];
        this.disMeta = type;
    }

    private consumeBytes(count: number): number[] {
        const bytes: number[] = [];
        for (let i = 1; i <= count; i++) {
            const value = this.fb.bytes.at(this.currentIndex++);
            if (typeof value === "undefined") {
                throw Error(`Illegal state, no byte at index ${this.currentIndex}`);
            } else {
                bytes.push(value);
            }
        }
        return bytes;
    }

    private eatByteOrDie() {
        if (this.currentIndex >= this.fb.bytes.length) {
            throw Error("No more bytes");
        }
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
            const bd = new ByteDeclaration(this.consumeBytes(2));
            return new FullInstructionLine(["cartBase"], new InstructionLine(bd, 0, 0), []);
        }
        if (this.currentIndex === 2) {
            console.log("manually handling reset vector");
            const bd = new ByteDeclaration(this.consumeBytes(2));
            return new FullInstructionLine(["resetVector"], new InstructionLine(bd, 0, 0), []);
        }
        if (this.currentIndex === 4) {
            console.log("manually handling nmi vector");
            const bd = new ByteDeclaration(this.consumeBytes(2));
            return new FullInstructionLine(["nmiVector"], new InstructionLine(bd, 0, 0), []);
        }
        if (this.currentIndex === 6) {
            console.log("manually handling cart magic");
            const bd = new ByteDeclaration(this.consumeBytes(5));
            return new FullInstructionLine(["cartSig"], new InstructionLine(bd, 0, 0), []);
        }
        if (this.currentIndex < 11) {
            throw Error("well this is unexpected!");
        }

        const opcode = this.eatByteOrDie();
        const numInstructionBytes = Mos6502InstructionSet.numBytes(opcode) || 1;

        // if the instruction doesn't define an operand byte, its value is not guaranteed to be defined

        // if there are not enough bytes, return a ByteDeclaration for the remaining bytes
        let remainingBytes = this.fb.bytes.length - this.currentIndex;

        if (remainingBytes <= 0) {
            let bytes = [opcode]
            for (let i = 0; i < remainingBytes; i++) {
                bytes.push(this.currentIndex++);
            }
            const bd = new ByteDeclaration(bytes);
            return new FullInstructionLine(labels, new InstructionLine(bd, 0, 0), comments);
        } else {
            let firstOperandByte = 0;
            let secondOperandByte = 0;
            if (numInstructionBytes > 1) {
                firstOperandByte = this.eatByteOrDie();
            }
            if (numInstructionBytes === 3) {
                secondOperandByte = this.eatByteOrDie();
            }

            const il = new InstructionLine(this.iset.instruction(opcode), firstOperandByte, secondOperandByte);
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
        // TODO rewrite hexdump to work with this structure; may need to add outer className to ActionResult
        return [[["hexbyte", "ff"]]];
    }
};

export {hexDumper}