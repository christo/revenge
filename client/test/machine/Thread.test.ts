import {expect} from 'chai';

import {LE} from "../../src/machine/Endian";
import {Thread} from "../../src/machine/Thread";
import {ArrayMemory} from "../../src/machine/Memory";
import {Mos6502} from "../../src/machine/mos6502";
import {FileBlob} from "../../src/machine/FileBlob";
import {DisassemblyMetaImpl} from "../../src/machine/asm/DisassemblyMetaImpl";
import {Disassembler} from "../../src/machine/asm/Disassembler";
import {enumInstAddr, InstRec} from "../../src/machine/Tracer";

const ZERO_OFFSET: [number, string][] = [[0, "NULL"]];

describe("thread", () => {
  it("records executed instructions", () => {
    const contents = [0, 0, 0xea, 0xea]; // 0, 0, NOP, NOP
    const memory = new ArrayMemory(contents, LE, true, true);
    const fb = FileBlob.fromBytes("testblob", contents, LE);
    const dm = new DisassemblyMetaImpl(0, ZERO_OFFSET, 2);
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
    const brk = Mos6502.ISA.byName("BRK").getBytes()[0];
    const contents = [
      0, 0,             // 0, 1 - load address
      0x4c, 0x06, 0x00, // 2, 3, 4 - JMP $0006
      brk,              // 5
      0xea,             // 6 NOP
      brk               // 7
    ];
    const memory = new ArrayMemory(contents, LE, true, true);
    const fb = FileBlob.fromBytes("testblob", contents, LE);
    const dm = new DisassemblyMetaImpl(0, ZERO_OFFSET, 2);
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
