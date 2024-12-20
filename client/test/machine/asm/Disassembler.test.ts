import {expect} from 'chai';
import {LE} from "../../../src/machine/core";
import {createDisassembler, niladicOpcodes} from "../util";
import {AddressingMode, MODE_ABSOLUTE, Mos6502} from "../../../src/machine/mos6502";
import {OpSemantics} from "../../../src/machine/Op";
import {ArrayMemory} from "../../../src/machine/Memory";

describe("disassembler", () => {
  it("disassembles single niladic instruction", () => {
    const bytes = niladicOpcodes(["NOP"]);
    const code: number[] = [0, 0, ...bytes];
    const mem = new ArrayMemory(code, LE, true, true);
    const d = createDisassembler(code, 2);
    const disassembled = d.disassemble1(mem, 2);
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
    expect(instruction.op.has(OpSemantics.IS_UNCONDITIONAL_JUMP)).to.equal(true);
    expect(op.mnemonic).to.equal("JMP");
    expect(instruction.mode).to.equal(MODE_ABSOLUTE);
    expect(disassembled.getBytes().length).to.equal(3);
    expect(disassembled.operandValue()).to.equal(0x6502);
  });
})