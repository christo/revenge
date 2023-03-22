/*
 MOS Technology 6502-family of 8-bit microprocessors.

 API for CPU definition. Intended to support emulation, assembly and disassembly in a reverse engineering workflow
 in particular. Should not depend on assembler, disassembler or emulator.

 */

import {assertByte, hex16} from "../misc/BinUtils";
import {SectionType} from "./asm";

class AddressingMode {
    code: string;
    desc: string;
    template: string;
    blurb: string
    numOperandBytes: number;

    constructor(code: string, desc: string, template: string, blurb: string, numOperandBytes: number) {
        this.code = code;
        this.desc = desc;
        this.template = template;
        this.blurb = blurb;
        this.numOperandBytes = numOperandBytes;
    }
}

class Op {
    mnemonic: string;
    description: string;
    /** mnemonic category */
    cat: string;

    constructor(mnemonic: string, description: string, cat: string) {
        this.mnemonic = mnemonic;
        this.description = description;
        this.cat = cat;
    }
}

// awkward impl needs to be fixed
class StatusRegisterFlag {
    name: string;
    description: string;
    bit: number;
    mask: number;

    constructor(name: string, description: string, bit: number) {
        if (bit < 0 || bit > 7) {
            throw new Error("status flag bit number must be 0-7");
        }
        this.name = name;
        this.description = description;
        this.bit = bit;
        this.mask = 0x01 << bit;
    }

    isSet(sr: number) {
        return sr & this.mask;
    }
}

const SR_FLAGS: ArrayLike<StatusRegisterFlag> = (() => {
    let b = 0;
    return [
        new StatusRegisterFlag("C", "Carry", b++),
        new StatusRegisterFlag("Z", "Zero", b++),
        new StatusRegisterFlag("I", "Interrupt (IRQ disable)", b++),
        new StatusRegisterFlag("D", "Decimal (use BCD for arithmetics)", b++),
        new StatusRegisterFlag("B", "Break", b++),
        new StatusRegisterFlag("-", "ignored", b++),
        new StatusRegisterFlag("V", "Overflow", b++),
        new StatusRegisterFlag("N", "Negative", b++),
    ];
})();

/* The code for each addressing mode should be suitable to use as css classes */
const MODE_ACCUMULATOR = new AddressingMode("acc", "accumulator implied", "OPC A",
    "operand is AC (implied single byte instruction)", 0);
const MODE_ABSOLUTE = new AddressingMode("abs", "absolute", "OPC $LLHH",
    "operand is address $HHLL", 2);
const MODE_ABSOLUTE_X = new AddressingMode("abs_x", "absolute, X-indexed",
    "OPC $LLHH,X", "operand is address; effective address is address incremented by X with carry", 2);
const MODE_ABSOLUTE_Y = new AddressingMode("abs_y", "absolute, Y-indexed", "OPC $LLHH,Y",
    "operand is address; effective address is address incremented by Y with carry", 2);
const MODE_IMMEDIATE = new AddressingMode("imm", "immediate", "OPC #$BB",
    "operand is byte BB", 1);
const MODE_IMPLIED = new AddressingMode("impl", "implied", "OPC", "operand implied", 0);
const MODE_INDIRECT = new AddressingMode("ind", "indirect",
    "OPC ($LLHH)", "operand is address; effective address is contents of word at address: C.w($HHLL)", 2);
const MODE_INDIRECT_X = new AddressingMode("x_ind", "X-indexed, indirect",
    "OPC ($LL,X)",
    "operand is zeropage address; effective address is word in (LL + X, LL + X + 1), inc. without carry: C.w($00LL + X)", 1);
const MODE_INDIRECT_Y = new AddressingMode("ind_y", "indirect, Y-indexed",
    "OPC ($LL),Y",
    "operand is zeropage address; effective address is word in (LL, LL + 1) incremented by Y with carry: C.w($00LL) + Y", 1);
const MODE_RELATIVE = new AddressingMode("rel", "relative", "OPC $BB",
    "branch target is PC + signed offset BB ***", 1);
const MODE_ZEROPAGE = new AddressingMode("zpg", "zeropage", "OPC $LL",
    "operand is zeropage address (hi-byte is zero, address = $00LL)", 1);
const MODE_ZEROPAGE_X = new AddressingMode("zpg_x", "zeropage, X-indexed", "OPC $LL,X",
    "operand is zeropage address; effective address is address incremented by X without carry", 1);
const MODE_ZEROPAGE_Y = new AddressingMode("zpg_y", "zeropage, Y-indexed", "OPC $LL,Y",
    "operand is zeropage address; effective address is address incremented by Y without carry", 1);

/** Arithmetic */
const MATH = "arith";
/** Branch instructions */
const BRA = "br";
/** Stack instructions */
const ST = "st";
/** Logic instructions */
const LG = "lg"
/** Flow instructions */
const FL = "fl";
/** Status register instructions */
const SR = "sr";
/** Interrupt instructions */
const INT = "int";
/** Memory instructions */
const MEM = "mem";
/** Transfer instructions */
const TR = "tr";
/** Subroutine instructions */
const SUB = "sub"
/** Misc */
const MS = "ms";

const ADC = new Op("ADD", "add with carry", MATH);
const AND = new Op("AND", "and (with accumulator)", LG);
const ASL = new Op("ASL", "arithmetic shift left", MATH);
const BCC = new Op("BCC", "branch on carry clear", BRA);
const BCS = new Op("BCS", "branch on carry set", BRA);
const BEQ = new Op("BEQ", "branch on equal (zero set)", BRA);
const BIT = new Op("BIT", "bit test", LG);
const BMI = new Op("BMI", "branch on minus (negative set)", BRA);
const BNE = new Op("BNE", "branch on not equal (zero clear)", BRA);
const BPL = new Op("BPL", "branch on plus (negative clear)", BRA);
const BRK = new Op("BRK", "break / interrupt", FL);
const BVC = new Op("BVC", "branch on overflow clear", BRA);
const BVS = new Op("BVS", "branch on overflow set", BRA);
const CLC = new Op("CLC", "clear carry", MATH);
const CLD = new Op("CLD", "clear decimal", SR);
const CLI = new Op("CLI", "clear interrupt disable", INT);
const CLV = new Op("CLV", "clear overflow", SR);
const CMP = new Op("CMP", "compare (with accumulator)", LG);
const CPX = new Op("CPX", "compare with X", LG);
const CPY = new Op("CPY", "compare with Y", LG);
const DEC = new Op("DEC", "decrement", MATH);
const DEX = new Op("DEX", "decrement X", MATH);
const DEY = new Op("DEY", "decrement Y", MATH);
const EOR = new Op("EOR", "exclusive or (with accumulator)", LG);
const INC = new Op("INC", "increment", MATH);
const INX = new Op("INX", "increment X", MATH);
const INY = new Op("INY", "increment Y", MATH);
const JMP = new Op("JMP", "jump", BRA);
const JSR = new Op("JSR", "jump subroutine", SUB);
const LDA = new Op("LDA", "load accumulator", MEM);
const LDX = new Op("LDX", "load X", MEM);
const LDY = new Op("LDY", "load Y", MEM);
const LSR = new Op("LSR", "logical shift right", MATH);
const NOP = new Op("NOP", "no operation", MS);
const ORA = new Op("ORA", "or with accumulator", LG);
const PHA = new Op("PHA", "push accumulator", ST);
const PHP = new Op("PHP", "push processor status (SR)", ST);
const PLA = new Op("PLA", "pull accumulator", ST);
const PLP = new Op("PLP", "pull processor status (SR)", ST);
const ROL = new Op("ROL", "rotate left", MATH);
const ROR = new Op("ROR", "rotate right", MATH);
const RTI = new Op("RTI", "return from interrupt", INT);
const RTS = new Op("RTS", "return from subroutine", SUB);
const SBC = new Op("SBC", "subtract with carry", MATH);
const SEC = new Op("SEC", "set carry", SR);
const SED = new Op("SED", "set decimal", SR);
const SEI = new Op("SEI", "set interrupt disable", INT);
const STA = new Op("STA", "store accumulator", MEM);
const STX = new Op("STX", "store X", MEM);
const STY = new Op("STY", "store Y", MEM);
const TAX = new Op("TAX", "transfer accumulator to X", TR);
const TAY = new Op("TAY", "transfer accumulator to Y", TR);
const TSX = new Op("TSX", "transfer stack pointer to X", TR);
const TXA = new Op("TXA", "transfer X to accumulator", TR);
const TXS = new Op("TXS", "transfer X to stack pointer", TR);
const TYA = new Op("TYA", "transfer Y to accumulator", TR);

/**
 * Representation of the number of machine cycles that an instruction takes. This is
 * dependent on crossing page boundaries and, for branch instructions, whether the
 * branch was taken.
 */
class Cycles {
    /** System-wide per-instruction minimum guard. */
    static MIN_CYCLES = 2;
    /** System-wide per-instruction maximum guard. */
    static MAX_CYCLES = 7;

    /** Fixed cycle cost. */
    static FIXED = (n: number) => new Cycles(n, 0, 0, 0);
    /** For branches, additional cost for taking branch, further cost for branching across page boundary. */
    static BRANCH = (n: number) => new Cycles(n, 0, 1, 2);
    /** Costs n cycles with additional cycle for crossing page boundary. */
    static XPAGE = (n: number) => new Cycles(n, 1, 0, 0);

    private min: number;
    private xPage: number;
    private branch: number;
    private branchXPage: number;

    private constructor(min: number, xPage: number, branch: number, branchXPage: number) {
        if (min < Cycles.MIN_CYCLES || min > Cycles.MAX_CYCLES) {
            throw new Error(`Cycles out of range: ${Cycles.MIN_CYCLES}-${Cycles.MAX_CYCLES}`);
        }
        this.min = min;
        this.xPage = xPage;
        this.branch = branch;
        this.branchXPage = branchXPage;
    }
}

class Instruction implements InstructionLike<SectionType.CODE> {
    private readonly _op: Op;
    private readonly _numBytes: number;
    private readonly _mode: AddressingMode;
    private readonly opcode: number; // byte
    private minCycles: Cycles;
    private illegal: boolean;

    constructor(op: Op, mode: AddressingMode, opcode: number, numBytes: number, cycles: Cycles, illegal: boolean) {
        this._op = op;
        this._mode = mode;
        this.opcode = opcode;
        this._numBytes = numBytes;
        this.minCycles = cycles;
        this.illegal = illegal;
    }

    get type(): SectionType.CODE {
        return SectionType.CODE;
    }

    get op(): Op {
        return this._op;
    }

    get numBytes(): number {
        return this._numBytes;
    }

    get mode(): AddressingMode {
        return this._mode;
    }

    get rawBytes(): Array<number> {
        return [this.opcode];
    }
}

interface InstructionLike<T extends SectionType> {
    get rawBytes(): Array<number>;

    get type(): T;

    get numBytes(): number;
}

/** Represents the whole set of machine instructions. */
class InstructionSet {
    // note redundancy here, like all bad code, huddles behind the defense of performance,
    // prematurely optimised as per root of all evil
    private mnemonicToByte = new Map<string, number>([]);
    private ops: Array<Op> = [];
    private modes: Array<AddressingMode> = [];
    /** The number of bytes in the instruction with the given opcode */
    private bytes: Array<number> = [];
    // noinspection JSMismatchedCollectionQueryUpdate
    private cycles: Array<Cycles> = [];
    private instructions: Array<InstructionLike<any>> = [];

    add(opcode: number, op: Op, mode: AddressingMode, bytes: number, cycles: Cycles) {
        const o = assertByte(opcode);
        if (this.instructions[o]) {
            throw Error("Instruction for this opcode already registered.");
        }
        if (bytes !== 0 && bytes !== 1 && bytes !== 2 && bytes !== 3) {
            throw Error("number of bytes in an instruction should be only: 0,1,2 or 3");
        }
        this.mnemonicToByte.set(op.mnemonic, o);
        this.ops[o] = op;
        this.modes[o] = mode;
        this.bytes[o] = bytes;
        this.cycles[o] = cycles;
        this.instructions[o] = new Instruction(op, mode, o, bytes, cycles, false);
    }

    op(opcode: number) {
        return this.ops[assertByte(opcode)];
    }

    // noinspection JSUnusedGlobalSymbols
    mode(opcode: number) {
        return this.modes[assertByte(opcode)];
    }

    numBytes(opcode: number) {
        return this.bytes[assertByte(opcode)];
    }

    instruction(opcode: number) {
        return this.instructions[assertByte(opcode)];
    }

    /**
     * Add illegal opcodes as byte declarations for missing bytes. Bit hacky but ok for now.
     */
    fillIllegals() {
        for (let i = 0; i < 256; i++) {
            if (!this.instructions[i]) {
                this.instructions[i] = new IllegalOpcode([i]);
            }
        }
    }
}

class IllegalOpcode implements InstructionLike<SectionType.DATA> {
    private readonly _bytes: number[];

    constructor(bytes: number[]) {
        this._bytes = bytes;
    }

    get numBytes(): number {
        return this._bytes.length;
    }

    get rawBytes(): Array<number> {
        return this._bytes;
    }

    get type(): SectionType.DATA {
        return SectionType.DATA;
    }

}

// build the instruction set
const I = new InstructionSet();

// ADC
I.add(0x69, ADC, MODE_IMMEDIATE, 2, Cycles.FIXED(2));
I.add(0x65, ADC, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0x75, ADC, MODE_ZEROPAGE_X, 2, Cycles.FIXED(4));
I.add(0x6d, ADC, MODE_ABSOLUTE, 3, Cycles.FIXED(4));
I.add(0x7d, ADC, MODE_ABSOLUTE_X, 3, Cycles.XPAGE(4));
I.add(0x79, ADC, MODE_ABSOLUTE_Y, 3, Cycles.XPAGE(4));
I.add(0x61, ADC, MODE_INDIRECT_X, 2, Cycles.FIXED(6));
I.add(0x71, ADC, MODE_INDIRECT_Y, 2, Cycles.XPAGE(5));

// AND
I.add(0x29, AND, MODE_IMMEDIATE, 2, Cycles.FIXED(2));
I.add(0x25, AND, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0x35, AND, MODE_ZEROPAGE_X, 2, Cycles.FIXED(4));
I.add(0x2d, AND, MODE_ABSOLUTE, 3, Cycles.FIXED(4));
I.add(0x3d, AND, MODE_ABSOLUTE_X, 3, Cycles.XPAGE(4));
I.add(0x39, AND, MODE_ABSOLUTE_Y, 3, Cycles.XPAGE(4));
I.add(0x21, AND, MODE_INDIRECT_X, 2, Cycles.FIXED(6));
I.add(0x31, AND, MODE_INDIRECT_Y, 2, Cycles.XPAGE(5));

// ASL
I.add(0x0a, ASL, MODE_ACCUMULATOR, 1, Cycles.FIXED(2));
I.add(0x06, ASL, MODE_ZEROPAGE, 2, Cycles.FIXED(5));
I.add(0x16, ASL, MODE_ZEROPAGE_X, 2, Cycles.FIXED(6));
I.add(0x0e, ASL, MODE_ABSOLUTE, 3, Cycles.FIXED(6));
I.add(0x1e, ASL, MODE_ABSOLUTE_X, 3, Cycles.FIXED(7));

I.add(0x90, BCC, MODE_RELATIVE, 2, Cycles.BRANCH(2));
I.add(0xb0, BCS, MODE_RELATIVE, 2, Cycles.BRANCH(2));
I.add(0xf0, BEQ, MODE_RELATIVE, 2, Cycles.BRANCH(2));
I.add(0x24, BIT, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0x2c, BIT, MODE_ABSOLUTE, 3, Cycles.FIXED(4));
I.add(0x30, BMI, MODE_RELATIVE, 2, Cycles.BRANCH(2));
I.add(0xd0, BNE, MODE_RELATIVE, 2, Cycles.BRANCH(2));
I.add(0x10, BPL, MODE_RELATIVE, 2, Cycles.BRANCH(2));
I.add(0x00, BRK, MODE_IMPLIED, 1, Cycles.FIXED(7));
I.add(0x50, BVC, MODE_RELATIVE, 2, Cycles.BRANCH(2));
I.add(0x70, BVS, MODE_RELATIVE, 2, Cycles.BRANCH(2));
I.add(0x18, CLC, MODE_IMPLIED, 1, Cycles.FIXED(2));
I.add(0xd8, CLD, MODE_IMPLIED, 1, Cycles.FIXED(2));
I.add(0x58, CLI, MODE_IMPLIED, 1, Cycles.FIXED(2));
I.add(0xb8, CLV, MODE_IMPLIED, 1, Cycles.FIXED(2));

// CMP
I.add(0xc9, CMP, MODE_IMMEDIATE, 2, Cycles.FIXED(2));
I.add(0xc5, CMP, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0xd5, CMP, MODE_ZEROPAGE_X, 2, Cycles.FIXED(4));
I.add(0xcd, CMP, MODE_ABSOLUTE, 3, Cycles.FIXED(4));
I.add(0xdd, CMP, MODE_ABSOLUTE_X, 3, Cycles.XPAGE(4));
I.add(0xd9, CMP, MODE_ABSOLUTE_Y, 3, Cycles.XPAGE(4));
I.add(0xc1, CMP, MODE_INDIRECT_X, 2, Cycles.FIXED(6));
I.add(0xd1, CMP, MODE_INDIRECT_Y, 2, Cycles.XPAGE(5));

// CPX
I.add(0xe0, CPX, MODE_IMMEDIATE, 2, Cycles.FIXED(2));
I.add(0xe4, CPX, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0xec, CPX, MODE_ABSOLUTE, 3, Cycles.FIXED(4));

// CPY
I.add(0xc0, CPY, MODE_IMMEDIATE, 2, Cycles.FIXED(2));
I.add(0xc4, CPY, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0xcc, CPY, MODE_ABSOLUTE, 3, Cycles.FIXED(4));

// DEC
I.add(0xc6, DEC, MODE_ZEROPAGE, 2, Cycles.FIXED(5));
I.add(0xd6, DEC, MODE_ZEROPAGE_X, 2, Cycles.FIXED(6));
I.add(0xce, DEC, MODE_ABSOLUTE, 3, Cycles.FIXED(6));
I.add(0xde, DEC, MODE_ABSOLUTE_X, 3, Cycles.FIXED(7));

// DE*
I.add(0xca, DEX, MODE_IMPLIED, 1, Cycles.FIXED(2));
I.add(0x88, DEY, MODE_IMPLIED, 1, Cycles.FIXED(2));

// EOR
I.add(0x49, EOR, MODE_IMMEDIATE, 2, Cycles.FIXED(2));
I.add(0x45, EOR, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0x55, EOR, MODE_ZEROPAGE_X, 2, Cycles.FIXED(4));
I.add(0x4d, EOR, MODE_ABSOLUTE, 3, Cycles.FIXED(4));
I.add(0x5d, EOR, MODE_ABSOLUTE_X, 3, Cycles.XPAGE(4));
I.add(0x59, EOR, MODE_ABSOLUTE_Y, 3, Cycles.XPAGE(4));
I.add(0x41, EOR, MODE_INDIRECT_X, 2, Cycles.FIXED(6));
I.add(0x51, EOR, MODE_INDIRECT_Y, 2, Cycles.XPAGE(5));

// INC
I.add(0xe6, INC, MODE_ZEROPAGE, 2, Cycles.FIXED(5));
I.add(0xf6, INC, MODE_ZEROPAGE_X, 2, Cycles.FIXED(6));
I.add(0xee, INC, MODE_ABSOLUTE, 3, Cycles.FIXED(6));
I.add(0xfe, INC, MODE_ABSOLUTE_X, 3, Cycles.FIXED(7));

// IN*
I.add(0xe8, INX, MODE_IMPLIED, 1, Cycles.FIXED(2));
I.add(0xc8, INY, MODE_IMPLIED, 1, Cycles.FIXED(2));

I.add(0x4c, JMP, MODE_ABSOLUTE, 3, Cycles.FIXED(3));
I.add(0x6c, JMP, MODE_INDIRECT, 3, Cycles.FIXED(5));
I.add(0x20, JSR, MODE_ABSOLUTE, 3, Cycles.FIXED(6));

// LDA
I.add(0xa9, LDA, MODE_IMMEDIATE, 2, Cycles.FIXED(2));
I.add(0xa5, LDA, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0xb5, LDA, MODE_ZEROPAGE_X, 2, Cycles.FIXED(4));
I.add(0xad, LDA, MODE_ABSOLUTE, 3, Cycles.FIXED(4));
I.add(0xbd, LDA, MODE_ABSOLUTE_X, 3, Cycles.XPAGE(4));
I.add(0xb9, LDA, MODE_ABSOLUTE_Y, 3, Cycles.XPAGE(4));
I.add(0xa1, LDA, MODE_INDIRECT_X, 2, Cycles.FIXED(6));
I.add(0xb1, LDA, MODE_INDIRECT_Y, 2, Cycles.XPAGE(5));

// LDX
I.add(0xa2, LDX, MODE_IMMEDIATE, 2, Cycles.FIXED(2));
I.add(0xa6, LDX, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0xb6, LDX, MODE_ZEROPAGE_Y, 2, Cycles.FIXED(4));
I.add(0xae, LDX, MODE_ABSOLUTE, 3, Cycles.FIXED(4));
I.add(0xbe, LDX, MODE_ABSOLUTE_Y, 3, Cycles.XPAGE(4));

// LDY
I.add(0xa0, LDY, MODE_IMMEDIATE, 2, Cycles.FIXED(2));
I.add(0xa4, LDY, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0xb4, LDY, MODE_ZEROPAGE_X, 2, Cycles.FIXED(4));
I.add(0xac, LDY, MODE_ABSOLUTE, 3, Cycles.FIXED(4));
I.add(0xbc, LDY, MODE_ABSOLUTE_X, 3, Cycles.XPAGE(4));

// LSR
I.add(0x4a, LSR, MODE_ACCUMULATOR, 1, Cycles.FIXED(2));
I.add(0x46, LSR, MODE_ZEROPAGE, 2, Cycles.FIXED(5));
I.add(0x56, LSR, MODE_ZEROPAGE_X, 2, Cycles.FIXED(6));
I.add(0x4e, LSR, MODE_ABSOLUTE, 3, Cycles.FIXED(6));
I.add(0x5e, LSR, MODE_ABSOLUTE_X, 3, Cycles.FIXED(7));

I.add(0xea, NOP, MODE_IMPLIED, 1, Cycles.FIXED(2));

// ORA
I.add(0x09, ORA, MODE_IMMEDIATE, 2, Cycles.FIXED(2));
I.add(0x05, ORA, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0x15, ORA, MODE_ZEROPAGE_X, 2, Cycles.FIXED(4));
I.add(0x0d, ORA, MODE_ABSOLUTE, 3, Cycles.FIXED(4));
I.add(0x1d, ORA, MODE_ABSOLUTE_X, 3, Cycles.XPAGE(4));
I.add(0x19, ORA, MODE_ABSOLUTE_Y, 3, Cycles.XPAGE(4));
I.add(0x01, ORA, MODE_INDIRECT_X, 2, Cycles.FIXED(6));
I.add(0x11, ORA, MODE_INDIRECT_Y, 2, Cycles.XPAGE(5));

// stack ops
I.add(0x48, PHA, MODE_IMPLIED, 1, Cycles.FIXED(3));
I.add(0x08, PHP, MODE_IMPLIED, 1, Cycles.FIXED(3));
I.add(0x68, PLA, MODE_IMPLIED, 1, Cycles.FIXED(4));
I.add(0x28, PLP, MODE_IMPLIED, 1, Cycles.FIXED(4));

// ROL
I.add(0x2a, ROL, MODE_ACCUMULATOR, 1, Cycles.FIXED(2));
I.add(0x26, ROL, MODE_ZEROPAGE, 2, Cycles.FIXED(5));
I.add(0x36, ROL, MODE_ZEROPAGE_X, 2, Cycles.FIXED(6));
I.add(0x2e, ROL, MODE_ABSOLUTE, 3, Cycles.FIXED(6));
I.add(0x3e, ROL, MODE_ABSOLUTE_X, 3, Cycles.FIXED(7));

// ROR
I.add(0x6a, ROR, MODE_ACCUMULATOR, 1, Cycles.FIXED(2));
I.add(0x66, ROR, MODE_ZEROPAGE, 2, Cycles.FIXED(5));
I.add(0x76, ROR, MODE_ZEROPAGE_X, 2, Cycles.FIXED(6));
I.add(0x6e, ROR, MODE_ABSOLUTE, 3, Cycles.FIXED(6));
I.add(0x7e, ROR, MODE_ABSOLUTE_X, 3, Cycles.FIXED(7));

I.add(0x40, RTI, MODE_IMPLIED, 1, Cycles.FIXED(6));
I.add(0x60, RTS, MODE_IMPLIED, 1, Cycles.FIXED(6));

// SBC
I.add(0xe9, SBC, MODE_IMMEDIATE, 2, Cycles.FIXED(2));
I.add(0xe5, SBC, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0xf5, SBC, MODE_ZEROPAGE_X, 2, Cycles.FIXED(4));
I.add(0xed, SBC, MODE_ABSOLUTE, 3, Cycles.FIXED(4));
I.add(0xfd, SBC, MODE_ABSOLUTE_X, 3, Cycles.XPAGE(4));
I.add(0xf9, SBC, MODE_ABSOLUTE_Y, 3, Cycles.XPAGE(4));
I.add(0xe1, SBC, MODE_INDIRECT_X, 2, Cycles.FIXED(6));
I.add(0xf1, SBC, MODE_INDIRECT_Y, 2, Cycles.XPAGE(5));

I.add(0x38, SEC, MODE_IMPLIED, 1, Cycles.FIXED(2));
I.add(0xf8, SED, MODE_IMPLIED, 1, Cycles.FIXED(2));
I.add(0x78, SEI, MODE_IMPLIED, 1, Cycles.FIXED(2));

// STA
I.add(0x85, STA, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0x95, STA, MODE_ZEROPAGE_X, 2, Cycles.FIXED(4));
I.add(0x8d, STA, MODE_ABSOLUTE, 3, Cycles.FIXED(4));
I.add(0x9d, STA, MODE_ABSOLUTE_X, 3, Cycles.FIXED(5));
I.add(0x99, STA, MODE_ABSOLUTE_Y, 3, Cycles.FIXED(5));
I.add(0x81, STA, MODE_INDIRECT_X, 2, Cycles.FIXED(6));
I.add(0x91, STA, MODE_INDIRECT_Y, 2, Cycles.FIXED(6));

// STX
I.add(0x86, STX, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0x96, STX, MODE_ZEROPAGE_Y, 2, Cycles.FIXED(4));
I.add(0x8e, STX, MODE_ABSOLUTE, 3, Cycles.FIXED(4));

// LDY
I.add(0x84, STY, MODE_ZEROPAGE, 2, Cycles.FIXED(3));
I.add(0x94, STY, MODE_ZEROPAGE_X, 2, Cycles.FIXED(4));
I.add(0x8c, STY, MODE_ABSOLUTE, 3, Cycles.FIXED(4));

I.add(0xaa, TAX, MODE_IMPLIED, 1, Cycles.FIXED(2));
I.add(0xa8, TAY, MODE_IMPLIED, 1, Cycles.FIXED(2));
I.add(0xba, TSX, MODE_IMPLIED, 1, Cycles.FIXED(2));
I.add(0x8a, TXA, MODE_IMPLIED, 1, Cycles.FIXED(2));
I.add(0x9a, TXS, MODE_IMPLIED, 1, Cycles.FIXED(2));
I.add(0x98, TYA, MODE_IMPLIED, 1, Cycles.FIXED(2));

// have instruction set variants for the chip variants but also whether to allow illegal opcodes
I.fillIllegals();

class FullInstruction<T extends SectionType> {
    readonly instruction: InstructionLike<T>;    // contains operand byte size
    readonly firstByte: number;              // literal if defined by instruction
    readonly secondByte: number;              // literal if defined by instruction

    constructor(instruction: InstructionLike<T>, lobyte: number, hibyte: number) {
        this.instruction = instruction;
        this.firstByte = assertByte(lobyte);
        this.secondByte = assertByte(hibyte);
    }

    /** Gives the operand as a 16-bit little-endian number value. */
    operand16 = () => (this.secondByte << 8) + this.firstByte;
}

class Mos6502 {
    static readonly INSTRUCTIONS = I;

    static readonly STACK_LO = 0x0100;
    static readonly STACK_HI = 0x01ff;

    // NMI (Non-Maskable Interrupt) vector, 16-bit (LB, HB)
    static readonly VECTOR_NMI_LB = 0xfffa;
    static readonly VECTOR_NMI_HB = 0xfffb;

    // RES (Reset) vector, 16-bit (LB, HB)
    static readonly VECTOR_RESET_LB = 0xfffc;
    static readonly VECTOR_RESET_HB = 0xfffd;

    //  IRQ (Interrupt Request) vector, 16-bit (LB, HB)
    static readonly VECTOR_IRQ_LB = 0xfffe;
    static readonly VECTOR_IRQ_HB = 0xffff;
}

export {
    Mos6502,
    Instruction,
    FullInstruction,
    InstructionSet,
    MODE_ABSOLUTE,
    MODE_IMPLIED,
    MODE_ZEROPAGE,
    MODE_IMMEDIATE,
    MODE_RELATIVE,
    MODE_ACCUMULATOR,
    MODE_ABSOLUTE_X,
    MODE_ABSOLUTE_Y,
    MODE_ZEROPAGE_X,
    MODE_INDIRECT_X,
    MODE_INDIRECT_Y,
    MODE_INDIRECT,
    MODE_ZEROPAGE_Y,
    AddressingMode,
};
export type {
    InstructionLike,

}