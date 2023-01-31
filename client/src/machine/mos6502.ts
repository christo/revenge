/*
 MOS Technology 6502-family of microprocessors.
 */


class AddressingMode {
    code: string;
    desc: string;
    template: string;
    blurb: string

    constructor(code: string, desc: string, template: string, blurb: string) {
        this.code = code;
        this.desc = desc;
        this.template = template;
        this.blurb = blurb;
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
    
    isSet(sr:number){
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

const MODE_A = new AddressingMode("a", "accumulator implied", "OPC A",
    "operand is AC (impllied single byte instruction)");
const MODE_ABS = new AddressingMode("abs",	"absolute",	"OPC $LLHH",
    "operand is address $HHLL" );
const MODE_ABS_XINDEX = new AddressingMode("abs,X", "absolute, X-indexed",
    "OPC $LLHH,X", "operand is address; effective address is address incremented by X with carry **");
const MODE_ABS_YINDEX = new AddressingMode("abs,Y", "absolute, Y-indexed", "OPC $LLHH,Y",
    "operand is address; effective address is address incremented by Y with carry **");
const MODE_IMMEDIATE = new AddressingMode("    #", "immediate", "OPC #$BB",
    "operand is byte BB");
const MODE_IMPLIED = new AddressingMode("impl", "implied", "OPC",
    "operand implied");
const MODE_INDIRECT = new AddressingMode("ind", "indirect",
    "OPC ($LLHH)", "operand is address; effective address is contents of word at address: C.w($HHLL)");
const MODE_INDIRECT_XINDEX = new AddressingMode("X,ind", "X-indexed, indirect",
    "OPC ($LL,X)", "operand is zeropage address; effective address is word in (LL + X, LL + X + 1), inc. without carry: C.w($00LL + X)");
const MODE_INDIRECT_YINDEX = new AddressingMode("ind,Y", "indirect, Y-indexed",
    "OPC ($LL),Y", "operand is zeropage address; effective address is word in (LL, LL + 1) incremented by Y with carry: C.w($00LL) + Y");
const MODE_RELATIVE = new AddressingMode("rel", "relative", "OPC $BB",
    "branch target is PC + signed offset BB ***");
const MODE_ZEROPAGE = new AddressingMode("zpg", "zeropage", "OPC $LL",
    "operand is zeropage address (hi-byte is zero, address = $00LL)");
const MODE_ZEROPAGE_XINDEX = new AddressingMode("zpg,X", "zeropage, X-indexed", "OPC $LL,X",
    "operand is zeropage address; effective address is address incremented by X without carry **");
const MODE_ZEROPAGE_YINDEX = new AddressingMode("zpg,Y", "zeropage, Y-indexed", "OPC $LL,Y",
    "operand is zeropage address; effective address is address incremented by Y without carry **");


const ADD = new Op("ADD", "add with carry");
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



class Instruction {
    op: Op;
    mode: AddressingMode;
    opcode: number; // byte
    schema: string;     // boiled down psudocode
    flags: number;  // mask of affected status register flags
    minCycles: number;
    maxCycles: number;
    cycleBlurb: string;
    illegal: boolean;

    constructor(op: Op, mode: AddressingMode, opcode: number, schema: string, flags: number, minCycles: number, maxCycles: number, cycleBlurb: string, illegal: boolean) {
        this.op = op;
        this.mode = mode;
        this.opcode = opcode;
        this.schema = schema;
        this.flags = flags;
        this.minCycles = minCycles;
        this.maxCycles = maxCycles;
        this.cycleBlurb = cycleBlurb;
        this.illegal = illegal;
    }
}

// probably delete this:
type MnemonicToByte = {
    [key: string]: number;
};

class InstructionSet {
    mnemonicToByte = new Map<string,number>([]);
    ops:Array<Op> = [];
    modes:Array<AddressingMode> = [];
    operandBytes:Array<number> = [];
    cyclesMin:Array<number> = [];
    cyclesMax:Array<number> = [];

    add(opcode:number, op:Op, mode:AddressingMode, bytes:number, cyclesMin:number, cyclesMax:number) {
        const o = assertByte(opcode);
        if (bytes < 0 || bytes > 2) {
            throw Error("number of bytes in an operand should be only: 0,1 or 2");
        }
        this.mnemonicToByte.set(op.mnemonic,o);
        this.ops[o] = op;
        this.modes[o] = mode;
        this.operandBytes[o] = bytes;
        this.cyclesMin[o] = cyclesMin;
        this.cyclesMax[o] = cyclesMax;
    }
}

// build the instruction set
const ISET = new InstructionSet();


class InstructionLine {
    instruction:Instruction;
    arity:number;   //0,1,2
}

class Dialect {

    name: string;

    constructor(name?: string) {
        this.name = name? name : "Default Dialect";
    }

    /**
     * Parse input from index offset characters in,
     * interpret mnemonic syntax of our assembly dialect and return a datastructure
     * of properties for that machine instruction, including operands and expected
     * runtime in clock cycles.
     * @param input
     * @param index
     */
    assemble(input: string, index: number) {
        if (index >= input.length || index < 0) {
            throw Error("index out of range")
        }
        // parsing can fail if wrong or not enough bytes

        // return Instruction + 0-2 bytes operand + new index (may be beyond input which means finished)
        // or possibly return pseudo op
        // return value could also contain input offset, length, maybe metadata for comment etc.
    }

    render(instruction:InstructionLine) {
        return "TODO: instruction rendering"
    }
}

function disassemble(bytes:Uint8Array, index:number) {
    if (index >= bytes.length || index < 0) {
        throw Error("index out of range");
    }
    // emit data structure of instruction with operand
    // and use assembler dialect to render this into source text for a target assembler

}

const STACK_LO = 0x100;
const STACK_HI = 0x1ff;

// NMI (Non-Maskable Interrupt) vector, 16-bit (LB, HB)
const VECTOR_NMI_LB = 0xfffa;
const VECTOR_NMI_HB = 0xfffb;

// RES (Reset) vector, 16-bit (LB, HB)
const VECTOR_RESET_LB = 0xfffc;
const VECTOR_RESET_HB = 0xfffd;

//  IRQ (Interrupt Request) vector, 16-bit (LB, HB)
const VECTOR_IRQ_LB = 0xfffe;
const VECTOR_IRQ_HB = 0xffff;


class Mos6502 {


}

export default Mos6502;