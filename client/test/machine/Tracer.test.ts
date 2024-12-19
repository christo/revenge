import {expect} from 'chai';
import {Mos6502} from "../../src/machine/mos6502";
import {Tracer} from "../../src/machine/Tracer";
import {createDisassembler, niladicOpcodes, mem} from "./util";

describe("tracer", () => {
  it("runs then stops at BRK", () => {
    const machineCode: number[] = [
      0, 0, // base address 0x0000
      ...Mos6502.ISA.byName("BRK").getBytes(),
    ];
    const d = createDisassembler(machineCode, 2);
    const t = new Tracer(d, 0, mem(machineCode));
    expect(t.threads.length == 1, "should begin with 1 thread");
    expect(t.running(), "tracer should have started running");
    t.step();
    expect(!t.running(), "tracer should be stopped after hitting break");
    expect(t.threads.length == 1, "should end with 1 thread");
  });

  it("records executed locations", () => {
    const bytes: number[] = [
      0, 0, // base address 0x0000
      ...niladicOpcodes(["NOP", "NOP", "BRK"])
    ];
    const d = createDisassembler(bytes, 2);
    const t = new Tracer(d, 2, mem(bytes));
    expect(t.executed().length === 0, "should have executed none");
    t.step();
    expect(t.executed().length === 1);
    expect(t.executed()).to.have.members([2]);
    t.step();
    expect(t.executed().length === 2);
    expect(t.executed()).to.have.members([2, 3]);
    expect(t.running());
    t.step();
    expect(!t.running());
    expect(t.executed()).to.have.members([2, 3, 4]);
  });

  it.skip("handles unconditional jump", () => {
    // little endian addresses
    const bytes: number[] = [
      0, 0,                                     // 0, 1 base address
        // TODO assemble single line useful here
      0x4c, 0x06, 0x00,                         // 2, 3, 4 JMP $0006
      ...Mos6502.ISA.byName("BRK").getBytes(),  // 5  hits this if no jump
      ...Mos6502.ISA.byName("NOP").getBytes(),  // 6  jump target
      ...Mos6502.ISA.byName("BRK").getBytes(),  // 7  stop
    ];
    const d = createDisassembler(bytes, 2);
    const t = new Tracer(d, 2, mem(bytes));
    t.step(); // execute JMP
    t.step(); // execute NOP
    t.step(); // execute BRK
    // currently fails because JMP is not implemented in Tracer
    expect(t.executed()).to.have.members([2, 6, 7]);
  })
});

export {};