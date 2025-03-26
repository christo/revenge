import {expect} from 'chai';
import {LE} from "../../../src/machine/core";
import {niladicOpcodes} from "../util";
import {MODE_ABSOLUTE, Mos6502} from "../../../src/machine/mos6502";
import {OpSemantics} from "../../../src/machine/asm/Op";
import {ArrayMemory} from "../../../src/machine/Memory";
import {FileBlob} from "../../../src/machine/FileBlob";
import {DisassemblyMetaImpl} from "../../../src/machine/asm/DisassemblyMetaImpl";
import {Disassembler} from "../../../src/machine/asm/Disassembler";

describe("disassembler", () => {
  it("disassembles single niladic instruction", () => {
    const bytes = niladicOpcodes(["NOP"]);
    const code: number[] = [0, 0, ...bytes];
    const mem = new ArrayMemory(code, LE, true, true);
    const fb = FileBlob.fromBytes("testblob", code, LE);
    const dm = new DisassemblyMetaImpl(0, [[0, "zero"]], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const disassembled = d.disassemble1(mem, 2);
    expect(disassembled.instruction.op.mnemonic).to.equal("NOP");
  });
  it("disassembles single JMP instruction", () => {
    const bytes = [
      0x4c, 0x02, 0x65  // JMP $6502
    ];
    const code: number[] = [0, 0, ...bytes];
    const mem = new ArrayMemory(code, LE, true, true);
    const fb = FileBlob.fromBytes("testblob", bytes, LE);
    const dm = new DisassemblyMetaImpl(0, [[0, "zero"]], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const disassembled = d.disassemble1(mem, 2);
    const instruction = disassembled.instruction;
    const op = instruction.op;
    expect(instruction.op.has(OpSemantics.IS_UNCONDITIONAL_JUMP)).to.equal(true);
    expect(op.mnemonic).to.equal("JMP");
    expect(instruction.mode).to.equal(MODE_ABSOLUTE);
    expect(disassembled.getBytes().length).to.equal(3);
    expect(disassembled.operandValue()).to.equal(0x6502);
  });
});
