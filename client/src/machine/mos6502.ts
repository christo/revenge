/*
 MOS Technology 6502-family of microprocessors.

 API for emulation, assembly and disassembly. Intended to support a reverse engineering workflow
 in particular. So the disassembler needs to be able to be given hints or guards, also curated
 labels.

 */


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

    constructor(mnemonic: string, description: string) {
        this.mnemonic = mnemonic;
        this.description = description;
    }
}

// TODO fix this, very awkward. Need fromByte(b) and per flag methods
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
        // TODO check that ts type for byte is sensible here
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

const MODE_ACCUMULATOR = new AddressingMode("a", "accumulator implied", "OPC A",
    "operand is AC (implied single byte instruction)", 0);
const MODE_ABSOLUTE = new AddressingMode("abs", "absolute", "OPC $LLHH",
    "operand is address $HHLL", 2);
const MODE_ABSOLUTE_X = new AddressingMode("abs,X", "absolute, X-indexed",
    "OPC $LLHH,X", "operand is address; effective address is address incremented by X with carry", 2);
const MODE_ABSOLUTE_Y = new AddressingMode("abs,Y", "absolute, Y-indexed", "OPC $LLHH,Y",
    "operand is address; effective address is address incremented by Y with carry", 2);
const MODE_IMMEDIATE = new AddressingMode("    #", "immediate", "OPC #$BB",
    "operand is byte BB", 1);
const MODE_IMPLIED = new AddressingMode("impl", "implied", "OPC", "operand implied", 0);
const MODE_INDIRECT = new AddressingMode("ind", "indirect",
    "OPC ($LLHH)", "operand is address; effective address is contents of word at address: C.w($HHLL)", 2);
const MODE_INDIRECT_X = new AddressingMode("X,ind", "X-indexed, indirect",
    "OPC ($LL,X)",
    "operand is zeropage address; effective address is word in (LL + X, LL + X + 1), inc. without carry: C.w($00LL + X)", 1);
const MODE_INDIRECT_Y = new AddressingMode("ind,Y", "indirect, Y-indexed",
    "OPC ($LL),Y",
    "operand is zeropage address; effective address is word in (LL, LL + 1) incremented by Y with carry: C.w($00LL) + Y", 1);
const MODE_RELATIVE = new AddressingMode("rel", "relative", "OPC $BB",
    "branch target is PC + signed offset BB ***", 1);
const MODE_ZEROPAGE = new AddressingMode("zpg", "zeropage", "OPC $LL",
    "operand is zeropage address (hi-byte is zero, address = $00LL)", 1);
const MODE_ZEROPAGE_X = new AddressingMode("zpg,X", "zeropage, X-indexed", "OPC $LL,X",
    "operand is zeropage address; effective address is address incremented by X without carry", 1);
const MODE_ZEROPAGE_Y = new AddressingMode("zpg,Y", "zeropage, Y-indexed", "OPC $LL,Y",
    "operand is zeropage address; effective address is address incremented by Y without carry", 1);


const ADC = new Op("ADD", "add with carry");
const AND = new Op("AND", "and (with accumulator)");
const ASL = new Op("ASL", "arithmetic shift left");
const BCC = new Op("BCC", "branch on carry clear");
const BCS = new Op("BCS", "branch on carry set");
const BEQ = new Op("BEQ", "branch on equal (zero set)");
const BIT = new Op("BIT", "bit test");
const BMI = new Op("BMI", "branch on minus (negative set)");
const BNE = new Op("BNE", "branch on not equal (zero clear)");
const BPL = new Op("BPL", "branch on plus (negative clear)");
const BRK = new Op("BRK", "break / interrupt");
const BVC = new Op("BVC", "branch on overflow clear");
const BVS = new Op("BVS", "branch on overflow set");
const CLC = new Op("CLC", "clear carry");
const CLD = new Op("CLD", "clear decimal");
const CLI = new Op("CLI", "clear interrupt disable");
const CLV = new Op("CLV", "clear overflow");
const CMP = new Op("CMP", "compare (with accumulator)");
const CPX = new Op("CPX", "compare with X");
const CPY = new Op("CPY", "compare with Y");
const DEC = new Op("DEC", "decrement");
const DEX = new Op("DEX", "decrement X");
const DEY = new Op("DEY", "decrement Y");
const EOR = new Op("EOR", "exclusive or (with accumulator)");
const INC = new Op("INC", "increment");
const INX = new Op("INX", "increment X");
const INY = new Op("INY", "increment Y");
const JMP = new Op("JMP", "jump");
const JSR = new Op("JSR", "jump subroutine");
const LDA = new Op("LDA", "load accumulator");
const LDX = new Op("LDX", "load X");
const LDY = new Op("LDY", "load Y");
const LSR = new Op("LSR", "logical shift right");
const NOP = new Op("NOP", "no operation");
const ORA = new Op("ORA", "or with accumulator");
const PHA = new Op("PHA", "push accumulator");
const PHP = new Op("PHP", "push processor status (SR)");
const PLA = new Op("PLA", "pull accumulator");
const PLP = new Op("PLP", "pull processor status (SR)");
const ROL = new Op("ROL", "rotate left");
const ROR = new Op("ROR", "rotate right");
const RTI = new Op("RTI", "return from interrupt");
const RTS = new Op("RTS", "return from subroutine");
const SBC = new Op("SBC", "subtract with carry");
const SEC = new Op("SEC", "set carry");
const SED = new Op("SED", "set decimal");
const SEI = new Op("SEI", "set interrupt disable");
const STA = new Op("STA", "store accumulator");
const STX = new Op("STX", "store X");
const STY = new Op("STY", "store Y");
const TAX = new Op("TAX", "transfer accumulator to X");
const TAY = new Op("TAY", "transfer accumulator to Y");
const TSX = new Op("TSX", "transfer stack pointer to X");
const TXA = new Op("TXA", "transfer X to accumulator");
const TXS = new Op("TXS", "transfer X to stack pointer");
const TYA = new Op("TYA", "transfer Y to accumulator");

function assertByte(value: number) {
    if (value < 0 || value > 255) {
        throw Error("expecting an unsigned byte value (was " + value + ")");
    }
    return value & 0xff;
}

class Cycles {
    /** System-wide per-instruction minimum */
    static MIN_CYCLES = 2;
    /** System-wide per-instruction maximum */
    static MAX_CYCLES = 7;

    static FIXED = (n: number) => new Cycles(n, 0, 0, 0);
    static BRANCH = (n: number) => new Cycles(n, 0, 1, 2);
    static XPAGE = (n: number) => new Cycles(n, 1, 0, 0);

    private minCycles: number;
    private crossPagePenalty: number;
    private branchSamePagePenalty: number;
    private branchCrossPagePenalty: number;

    private constructor(minCycles: number, crossPagePenalty: number, branchSamePagePenalty: number, branchCrossPagePenalty: number) {
        if (minCycles < Cycles.MIN_CYCLES || minCycles > Cycles.MAX_CYCLES) {
            throw new Error(`Cycles out of range: ${Cycles.MIN_CYCLES}-${Cycles.MAX_CYCLES}`);
        }
        this.minCycles = minCycles;
        this.crossPagePenalty = crossPagePenalty;
        this.branchSamePagePenalty = branchSamePagePenalty;
        this.branchCrossPagePenalty = branchCrossPagePenalty;
    }
}

class Instruction implements InstructionLike {
    private readonly _op: Op;
    private readonly _numBytes: number;
    private readonly _mode: AddressingMode;
    private opcode: number; // byte
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

    get op(): Op {
        return this._op;
    }

    get numBytes(): number {
        return this._numBytes;
    }

    get mode(): AddressingMode {
        return this._mode;
    }

    get rawByte(): number {
        return this.opcode;
    }

    isMachineInstruction(): boolean {
        return true;
    }
}

interface InstructionLike {
    isMachineInstruction(): boolean;
    get rawByte(): number;
}

class ByteDeclaration implements InstructionLike {

    private readonly _rawByte: number;

    constructor(rawByte: number) {
        this._rawByte = assertByte(rawByte);
    }

    isMachineInstruction(): boolean {
        return false;
    }

    get rawByte(): number {
        return this._rawByte;
    }
}

/** Represents the whole set of machine instructions. */
class InstructionSet {
    // note redundancy here, like all bad code, huddles behind the defense of performance,
    // prematurely optimised as per root of all evil
    private mnemonicToByte = new Map<string, number>([]);
    private ops: Array<Op> = [];
    private modes: Array<AddressingMode> = [];
    private bytes: Array<number> = [];
    private cycles: Array<Cycles> = [];
    private instructions: Array<Instruction> = [];

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

    mode(opcode: number) {
        return this.modes[assertByte(opcode)];
    }

    numBytes(opcode: number) {
        return this.bytes[assertByte(opcode)];
    }

    instruction(opcode: number) {
        return this.instructions[assertByte(opcode)];
    }
}

// build the instruction set
const I = new InstructionSet();

// TODO confirm that addressing mode defines bytes (seems to) in which case move byte spec to addressing mode

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

// TODO add illegal opcodes

class InstructionLine {
    instruction: InstructionLike;    // contains operand byte size
    lobyte: number;              // literal if defined by instruction
    hibyte: number;              // literal if defined by instruction

    // TODO implement instruction feature API? AST for renderer?
    // TODO implement value fetch somewhere maybe not here

    constructor(instruction: InstructionLike, lobyte: number, hibyte: number) {
        this.instruction = instruction;
        this.lobyte = assertByte(lobyte);
        this.hibyte = assertByte(hibyte);
    }

    /** Gives the operand as a 16 bit value. */
    operand16 = () => (this.hibyte << 8) & this.lobyte
}

/**
 * Need to support options, possibly at specific memory locations.
 * Global option may be lowercase opcodes.
 * Location-specific option might be arbitrary label, decimal operand, lo-byte selector "<" etc.
 * Some assembler dialects have other ways of rendering addressing modes (e.g suffix on mnemonic).
 * Can support use of symbols instead of numbers - user may prefer to autolabel kernal addresses.
 */
class Dialect {

    name: string;

    constructor(name?: string) {
        this.name = name ? name : "Default Dialect";
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
        let s = fil.labels.map((s, i) => s + ": \n").reduce((p, c) => p + c);
        let i:InstructionLike = fil.instructionLine.instruction;
        if (i.isMachineInstruction()) {
            let ii:Instruction = i as Instruction;  // TODO how should one do this without casting?
            return s + "    " + ii.op.mnemonic + " " + this.renderOperand(fil.instructionLine);
        } else {
            return `.byte $${this.hex8(i.rawByte)}`;
        }
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
                operand = "A";
                break;
            case MODE_ABSOLUTE:
                operand = this.hex16(il.operand16());
                break;
            case MODE_ABSOLUTE_X:
                operand = this.hex16(il.operand16()) + ", x";
                break;
            case MODE_ABSOLUTE_Y:
                operand = this.hex16(il.operand16()) + ", y";
                break;
            case MODE_IMMEDIATE:
                operand = "#" + this.hex8(il.lobyte);
                break;
            case MODE_IMPLIED:
                operand = "";
                break;
            case MODE_INDIRECT:
                operand = "(" + this.hex16(il.operand16()) + ")";
                break;
            case MODE_INDIRECT_X:
                operand = "(" + this.hex8(il.lobyte) + ", x)";
                break;
            case MODE_INDIRECT_Y:
                operand = "(" + this.hex8(il.lobyte) + "), y";
                break;
            case MODE_RELATIVE:
                // TODO can be negative byte, maybe render decimal
                operand = this.hex8(il.lobyte);
                break;
            case MODE_ZEROPAGE:
                operand = this.hex8(il.lobyte);
                break;
            case MODE_ZEROPAGE_X:
                operand = this.hex8(il.lobyte) + ", x"
                break;
            case MODE_ZEROPAGE_Y:
                operand = this.hex8(il.lobyte) + ", y"
                break;
        }
        return operand;
    }

    private hex16 = (x: number) => "$" + x.toString(16);
    private hex8 = (x: number) => "$" + assertByte(x).toString(16);
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
}

/** Stateful translator of bytes to their parsed instruction line */
class Disassembler {

    originalIndex: number;
    currentIndex: number;
    bytes: Uint8Array;
    currentAddress: number;

    // keep a log of jump and branch targets as well as instruction value fetch targets

    constructor(bytes: Uint8Array, index: number, baseAddress: number) {
        if (index >= bytes.length || index < 0) {
            throw Error("index out of range");
        }
        this.originalIndex = index;
        this.currentIndex = index;
        this.bytes = bytes;
        this.currentAddress = baseAddress;
    }

    eatByteOrDie() {
        if (this.currentIndex >= this.bytes.length) {
            throw Error("No more bytes");
        }
        const value = this.bytes.at(this.currentIndex++);
        if (!value) {
            throw Error("Illegal state, no byte at current index");
        } else {
            return (value & 0xff);
        }
    }

    /**
     * Returns true if we have any bytes to disassemble, even though
     * they might not make a valid instruction.
     */
    hasNextLine() {
        return this.currentIndex < this.bytes.length;
    }

    nextInstructionLine() {
        let labels: Array<string> = [];
        // need to allow multiple labels
        if (this.needsLabel(this.currentAddress)) {
            labels = this.generateLabels(this.currentAddress)
        }
        const opcode = this.eatByteOrDie();
        const numInstructionBytes = I.numBytes(opcode) || 1;

        // if the instruction doesn't define an operand byte, its value is not guaranteed to be defined

        // if we are out of bytes, maybe render as .byte 0xnn ?
        let firstByte = 0;
        let secondByte = 0;
        if (numInstructionBytes >= 1) {
            firstByte = this.eatByteOrDie();
        }
        if (numInstructionBytes === 2) {
            secondByte = this.eatByteOrDie();
        }

        const il = new InstructionLine(I.instruction(opcode), firstByte, secondByte);

        let comments: Array<string> = [];
        if (this.needsComment(this.currentAddress)) {
            comments = this.generateComments(this.currentAddress);
        }
        return new FullInstructionLine(labels, il, comments);
    }

    needsLabel = (addr: number) => false;
    generateLabels = (addr: number) => [];
    needsComment = (addr: number) => false;
    generateComments = (addr: number) => [];

    disassemble() {
        // use default dialect renderer
        // TODO lazy iterator(?) version of this.
        const result = [];
        while (this.hasNextLine()) {
            result.push(this.nextInstructionLine());
        }
        return result;
    }
}

class Mos6502 {
    static INSTRUCTIONS = I;

    static STACK_LO = 0x0100;
    static STACK_HI = 0x01ff;

    // NMI (Non-Maskable Interrupt) vector, 16-bit (LB, HB)
    static VECTOR_NMI_LB = 0xfffa;
    static VECTOR_NMI_HB = 0xfffb;

    // RES (Reset) vector, 16-bit (LB, HB)
    static VECTOR_RESET_LB = 0xfffc;
    static VECTOR_RESET_HB = 0xfffd;

    //  IRQ (Interrupt Request) vector, 16-bit (LB, HB)
    static VECTOR_IRQ_LB = 0xfffe;
    static VECTOR_IRQ_HB = 0xffff;
}

export {
    Mos6502,
    Disassembler,
    Dialect,
    InstructionSet
};