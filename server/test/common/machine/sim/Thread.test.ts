import {expect} from 'chai';
import {Disassembler} from "../../../../src/common/machine/asm/Disassembler.js";
import {DisassemblyMetaImpl, IndexedDescriptor} from "../../../../src/common/machine/asm/DisassemblyMetaImpl.js";

import {LE} from "../../../../src/common/machine/Endian.js";
import {FileBlob} from "../../../../src/common/machine/FileBlob.js";
import {ArrayMemory} from "../../../../src/common/machine/Memory.js";
import {Mos6502} from "../../../../src/common/machine/mos6502.js";
import {Thread} from "../../../../src/common/machine/sim/Thread.js";
import {enumInstAddr, InstRec} from "../../../../src/common/machine/sim/Tracer.js";
import {mockOffsetDescriptor} from "../util.js";

const ZERO_OFFSET: IndexedDescriptor = mockOffsetDescriptor();

describe("thread", () => {
  it("records executed instructions", () => {
    const contents = [0, 0, 0xea, 0xea]; // 0, 0, NOP, NOP
    const memory = new ArrayMemory(contents, LE, true, true);
    const fb = FileBlob.fromBytes("testblob", contents, LE);
    const dm = new DisassemblyMetaImpl(0, [ZERO_OFFSET], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);

    const executed: InstRec[] = [];
    const addExecuted = (ir: InstRec) => {
      executed.push(ir);
    }
    const getExecuted: () => InstRec[] = () => {
      return executed;
    }

    const t = new Thread("test", d, 0, memory, addExecuted, getExecuted);
    t.step();
    expect(getExecuted().length).to.eq(1, "expected single step to have executed one instruction");
  });

  it("executes JMP", () => {
    const brk = Mos6502.ISA.byName("BRK")!.getBytes()[0];
    const contents = [
      0, 0,             // 0, 1 - load address
      0x4c, 0x06, 0x00, // 2, 3, 4 - JMP $0006
      brk,              // 5
      0xea,             // 6 NOP
      brk               // 7
    ];
    const memory = new ArrayMemory(contents, LE, true, true);
    const fb = FileBlob.fromBytes("testblob", contents, LE);
    const dm = new DisassemblyMetaImpl(0, [ZERO_OFFSET], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const executed: InstRec[] = [];
    const addExecuted = (ir: InstRec) => {
      executed.push(ir);
    }
    const getExecuted: () => InstRec[] = () => {
      return executed;
    }
    const t = new Thread("test", d, 2, memory, addExecuted, getExecuted);
    expect(t.getPc()).to.eq(2, "start pc should be received by constructor");
    t.step(); // execute jump, should be at 6 NOP
    expect(t.getPc()).to.eq(6);
    t.step(); // should have executed
    expect(t.getPc()).to.eq(7);
    t.step();
    expect(t.getPc()).to.eq(8);
    // check all bytes belonging to executed instructions, only excluding 0x0005
    expect(getExecuted().flatMap(enumInstAddr)).to.have.members([2, 3, 4, 6, 7]);
  });
});
