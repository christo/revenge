import {expect} from 'chai';
import {Disassembler} from "../../../src/machine/asm/Disassembler";
import {Mos6502} from "../../../src/machine/mos6502";
import {FileBlob} from "../../../src/machine/FileBlob";
import {ArrayMemory, LE} from "../../../src/machine/core";
import {DisassemblyMetaImpl} from "../../../src/machine/asm/DisassemblyMetaImpl";
import {niladicOpcodes} from "../util";

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
  })
})