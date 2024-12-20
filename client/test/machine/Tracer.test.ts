import {expect} from 'chai';
import {Mos6502} from "../../src/machine/mos6502";
import {Tracer} from "../../src/machine/Tracer";
import {createDisassembler, niladicOpcodes, mem} from "./util";

const brk = Mos6502.ISA.byName("BRK").getBytes()[0];
const nop = Mos6502.ISA.byName("NOP").getBytes()[0];

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

  it("handles unconditional jump", () => {
    // little endian addresses
    const bytes: number[] = [
      0, 0,         // 0, 1   : $0000 base address
      0x4c, 6, 0,   // 2, 3, 4: JMP 6
      brk,          // 5      : BRK     ; stops here if no jump
      nop,          // 6      : NOP     ; jump target
      brk,          // 7      : BRK     ; intended stop
    ];
    const d = createDisassembler(bytes, 2);
    const t = new Tracer(d, 2, mem(bytes));
    t.step(); // execute JMP
    t.step(); // execute NOP
    t.step(); // execute BRK

    expect(t.executed()).to.not.have.members([2, 5], "JMP was ignored");
    expect(t.executed()).to.have.members([2, 6, 7]);
  });

  // TODO decide how base address is supposed to work for a trace
  //   a trace is an emulator so the code needs to be "loaded" at an address.
  //   A binary expects to be loaded at a fixed address, otherwise the addresses are wrong.
  it.skip("handles unconditional jump with base address", () => {
    const bytes: number[] = [
      0, 0x10,                                     // $1000 base address
      // TODO assemble single line useful here
      0x4c, 0x06, 0x10,                         // $1000, $1001, $1002 JMP $1006
      ...Mos6502.ISA.byName("BRK").getBytes(),  // $1003  stops here if no jump
      ...Mos6502.ISA.byName("NOP").getBytes(),  // $1004  jump target
      ...Mos6502.ISA.byName("BRK").getBytes(),  // $1005  stop
    ];
    const d = createDisassembler(bytes, 0x1000);
    const t = new Tracer(d, 0x1000, mem(bytes));
    t.step(); // execute JMP
    t.step(); // execute NOP
    t.step(); // execute BRK
    // currently fails because JMP is not implemented in Tracer
    const executed = t.executed();
    expect(executed[0]).to.not.equal(2, "base address was ignored");
    expect(t.executed()).to.not.have.members([0x1000, 0x1003]);
    expect(t.executed()).to.have.members([0x1000, 0x0004, 0x0005], "expected execution of jump");
  })
});

export {};