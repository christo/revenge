import {expect} from 'chai';
import {LE} from "../../src/machine/core";
import {Thread} from "../../src/machine/Thread";
import {createDisassembler} from "./util";
import {ArrayMemory} from "../../src/machine/Memory";
import {Mos6502} from "../../src/machine/mos6502";

describe("thread", () => {
  it("records executed instructions", () => {
    const contents = [0, 0, 0xea, 0xea]; // 0, 0, NOP, NOP
    const memory = new ArrayMemory(contents, LE, true, true);
    const d = createDisassembler(contents);
    const t = new Thread("test", d, 0, memory);
    t.step();
    expect(t.getExecuted().length).to.eq(1, "expected single step to have executed one instruction");
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
    const d = createDisassembler(contents);
    const t = new Thread("test", d, 2, memory);
    expect(t.getPc()).to.eq(2, "start pc should be received by constructor");
    t.step(); // execute jump, should be at 6 NOP
    expect(t.getPc()).to.eq(6);
    t.step(); // should have executed
    expect(t.getPc()).to.eq(7);
    t.step();
    expect(t.getPc()).to.eq(8);
  });
});
