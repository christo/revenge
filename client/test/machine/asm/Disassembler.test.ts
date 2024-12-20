import {expect} from 'chai';
import {ArrayMemory, LE} from "../../../src/machine/core";
import {createDisassembler, niladicOpcodes} from "../util";
import {AddressingMode, MODE_ABSOLUTE, Mos6502} from "../../../src/machine/mos6502";

describe("disassembler", () => {
  it("disassemble1 niladic", () => {
    const NOP_BYTES = niladicOpcodes(["NOP"]);
    const code: number[] = [0, 0, ...NOP_BYTES];
    const mem = new ArrayMemory(code, LE, true, true);
    const fb = new FileBlob("testblob", mem);
    const dm = new DisassemblyMetaImpl(0, 0, 2);
    const d: Disassembler = new Disassembler(Mos6502.ISA, fb, dm);
    const disassembled = d.disassemble1(mem, 2);
    console.log(disassembled);
    expect(disassembled.instruction.op.mnemonic).to.equal("NOP");
  });
  it("disassembles single JMP instruction", () => {
    const bytes = [
        0x4c, 0x02, 0x65  // JMP $6502
    ];
    const code: number[] = [0, 0, ...bytes];
    const mem = new ArrayMemory(code, LE, true, true);
    const d = createDisassembler(bytes, 2);
    const disassembled = d.disassemble1(mem, 2);
    const instruction = disassembled.instruction;
    const op = instruction.op;
    expect(instruction.op.isJump).to.equal(true);
    expect(op.mnemonic).to.equal("JMP");
    expect(instruction.mode).to.equal(MODE_ABSOLUTE);
    expect(disassembled.getBytes().length).to.equal(3);
    expect(disassembled.operand16()).to.equal(0x6502);
  });
})