import {expect} from 'chai';
import * as fs from "fs";
import {PRELOADS_DIR_VIC20} from "../../../../src/routes/constants.js";
import {Disassembler} from "../../../../src/common/machine/asm/Disassembler.js";
import {DisassemblyMetaImpl} from "../../../../src/common/machine/asm/DisassemblyMetaImpl.js";
import {InstructionLike} from "../../../../src/common/machine/asm/instructions.js";
import {OpSemantics} from "../../../../src/common/machine/asm/Op.js";

import {LE} from "../../../../src/common/machine/Endian.js";
import {FileBlob} from "../../../../src/common/machine/FileBlob.js";
import {ArrayMemory} from "../../../../src/common/machine/Memory.js";
import {MODE_ABSOLUTE, Mos6502} from "../../../../src/common/machine/mos6502.js";
import {mockOffsetDescriptor, niladicOpcodes} from "../util.js";


describe("disassembler", () => {
  it("disassembles single niladic instruction", () => {
    const bytes = niladicOpcodes(["NOP"]);
    const code: number[] = [0, 0, ...bytes];
    const mem = new ArrayMemory(code, LE, true, true);
    const fb = FileBlob.fromBytes("testblob", code, LE);
    const dm = new DisassemblyMetaImpl(0, [mockOffsetDescriptor(0, "zero")], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const disassembled = d.disassemble1(mem, 2)!;
    expect(disassembled.instruction.op.mnemonic).to.equal("NOP");
  });
  it("disassembles single JMP instruction", () => {
    const bytes = [
      0x4c, 0x02, 0x65  // JMP $6502
    ];
    const code: number[] = [0, 0, ...bytes];
    const mem = new ArrayMemory(code, LE, true, true);
    const fb = FileBlob.fromBytes("testblob", bytes, LE);
    const dm = new DisassemblyMetaImpl(0, [mockOffsetDescriptor(0, "zero")], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const disassembled = d.disassemble1(mem, 2)!;
    const instruction = disassembled.instruction;
    const op = instruction.op;
    expect(instruction.op.has(OpSemantics.IS_UNCONDITIONAL_JUMP)).to.equal(true);
    expect(op.mnemonic).to.equal("JMP");
    expect(instruction.mode).to.equal(MODE_ABSOLUTE);
    expect(disassembled.getBytes().length).to.equal(3);
    expect(disassembled.operandValue()).to.equal(0x6502);
  });
    it("disassembles hesmon, shallow test", () => {
      const f = fs.readFileSync(`../server/${PRELOADS_DIR_VIC20}/HesMon.prg`);
      const fb = FileBlob.fromBytes("hesmon", Array.from(f), Mos6502.ENDIANNESS);
      const dm = new DisassemblyMetaImpl(0, [mockOffsetDescriptor()], 2);
      const d = new Disassembler(Mos6502.ISA, fb, dm);
      const lines: InstructionLike[] = [];
      while (d.hasNext()) {
        lines.push(d.nextInstructionLine()!);
      }
      expect(lines.length).to.equal(1944); // includes *=$a000 directive
    });
});