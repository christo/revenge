import {expect} from 'chai';
import {Disassembler} from "../../src/machine/asm/Disassembler";
import {DisassemblyMetaImpl} from "../../src/machine/asm/DisassemblyMetaImpl";
import {LE} from "../../src/machine/core";
import {FileBlob} from "../../src/machine/FileBlob";
import {ArrayMemory} from "../../src/machine/Memory";
import {Mos6502} from "../../src/machine/mos6502";
import {Tracer} from "../../src/machine/Tracer";
import {mem} from "./util";

const brk = Mos6502.ISA.byName("BRK").getBytes()[0];
const nop = Mos6502.ISA.byName("NOP").getBytes()[0];

describe("tracer", () => {
  it("runs then stops at BRK", () => {
    const machineCode: number[] = [
      0, 0, // base address 0x0000
      brk,
    ];
    const fb = FileBlob.fromBytes("testblob", machineCode, LE);
    const dm = new DisassemblyMetaImpl(0, 0, 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
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
      nop, nop, brk
    ];
    const fb = FileBlob.fromBytes("testblob", bytes, LE);
    const dm = new DisassemblyMetaImpl(0, 0, 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const t = new Tracer(d, 0, ArrayMemory.zeroes(0x1000, LE, true, true));
    expect(t.executed().length === 0, "should have executed none");
    t.step();
    expect(t.executed().length === 1);
    expect(t.executed()).to.have.members([0]);
    t.step();
    expect(t.executed().length === 2);
    expect(t.executed()).to.have.members([0, 1]);
    expect(t.running());
    t.step();
    expect(!t.running());
    expect(t.executed()).to.have.members([0, 1, 2]);
  });

  it("handles unconditional jump", () => {
    // little endian addresses
    const bytes: number[] = [
      0, 0,         // base address = $0000
      0x4c, 4, 0,   // $0000, $1001, $1002: JMP $1004
      brk,          // $0003      : BRK     ; stops here if no jump
      nop,          // $0004      : NOP     ; jump target
      brk,          // $0005      : BRK     ; intended stop
    ];
    const fb = FileBlob.fromBytes("testblob", bytes, LE);
    const dm = new DisassemblyMetaImpl(0, 0, 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const t = new Tracer(d, 0, ArrayMemory.zeroes(0x1000, LE, true, true));
    t.step(); // execute JMP
    t.step(); // execute NOP
    t.step(); // execute BRK

    expect(t.executed()).to.not.have.members([0, 3], "JMP was ignored");
    expect(t.executed()).to.have.members([0, 4, 5]);
  });

  it("handles unconditional jump with base address", () => {
    const bytes: number[] = [
      0, 0x10,          // base address is $1000
      0x4c, 0x04, 0x10, // $1000, $1001, $1002 JMP $1004
      brk,              // $1003  stops here if no jump
      nop,              // $1004  jump target
      brk,              // $1005  intended stop
    ];
    const mem64k = ArrayMemory.zeroes(0x10000, LE, true, true);
    const fb = FileBlob.fromBytes("jump test", bytes, LE);
    const offsetBlobContent = 2;
    const offsetOfLoadAddress = 0;
    const offsetOfResetVector = 0;  // reset = entry point
    const dm = new DisassemblyMetaImpl(offsetOfLoadAddress, offsetOfResetVector, offsetBlobContent);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const t = new Tracer(d, 0x1000, mem64k);
    t.step(); // execute JMP
    t.step(); // execute NOP
    t.step(); // execute BRK
    const executed = t.executed();
    expect(executed[0]).to.not.equal(2, "base address was ignored");
    expect(t.executed()).to.not.have.members([0x1000, 0x1003]);
    expect(t.executed()).to.have.members([0x1000, 0x1004, 0x1005], "expected execution of jump");
  });

  it("handles simple conditional jump", () => {
    const bytes: number[] = [
      0, 0x10,          // base address is $1000
      0xb0, 0x03,       // BCS #3    ; $1000
      0x4c, 0x06, 0x10, // JMP $1006 ; $1002, $1003, $1004
      nop,              // NOP       ; $1005  bcs target
      brk,              // BRK       ; $1006  jmp target stop
    ];
    const mem64k = ArrayMemory.zeroes(0x10000, LE, true, true);
    const fb = FileBlob.fromBytes("bcs test", bytes, LE);
    const offsetBlobContent = 2;
    const offsetOfLoadAddress = 0;
    const offsetOfResetVector = 0;  // reset = entry point
    const dm = new DisassemblyMetaImpl(offsetOfLoadAddress, offsetOfResetVector, offsetBlobContent);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const t = new Tracer(d, 0x1000, mem64k);
    t.step(); // execute BCS, should split into two threads
    expect(t.countActiveThreads()).to.eq(2);
    t.step(); // branched thread executes NOP, JMP thread executes BRK
    t.step(); // execute BRK
    expect(t.executed()).to.have.members([0x1000, 0x1002, 0x1005, 0x1006]);
  });

  describe("tracer", () => {
    it("constructor validates initial state", () => {
      const mem64k = ArrayMemory.zeroes(0x10000, LE, true, true);
      const bytes: number[] = [
        0, 0x10,          // base address is $1000
        0xde, 0xad, 0xbe, 0xef,       // $1000-$1003 random data 0xdeadbeef
        0x08, 0x10,       // $1004-$1005 reset vector = $1008
        0xaa, 0xaa,       // $1004-$1007 random data 0xaaaa
        nop,              // NOP       ; $1008  nop
        brk,              // BRK       ; $1006  brk
      ];
      const fb = FileBlob.fromBytes("constructor validation test", bytes, LE);
      const offsetBlobContent = 2;
      // reset vector = entry point found at this offset
      const dm = new DisassemblyMetaImpl(0, 6, offsetBlobContent);
      const d = new Disassembler(Mos6502.ISA, fb, dm);

      const initialPc = 0x1000;
      // TODO use the offsetOfResetVector to find the reset vector
      // TODO start tracing at the reset vector
      const entryPoint = dm.executionEntryPoint(fb);
      console.log(`entry point address: 0x${entryPoint.toString(16)}`);
      expect(entryPoint).to.eq(0x1008);
      const t = new Tracer(d, initialPc, mem64k)

    });
  })
});

export {};