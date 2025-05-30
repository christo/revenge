import {expect} from 'chai';
import {Disassembler} from "../../../../src/common/machine/asm/Disassembler.js";
import {DisassemblyMetaImpl} from "../../../../src/common/machine/asm/DisassemblyMetaImpl.js";
import {Addr} from "../../../../src/common/machine/core.js";
import {LE} from "../../../../src/common/machine/Endian.js";
import {FileBlob} from "../../../../src/common/machine/FileBlob.js";
import {ArrayMemory} from "../../../../src/common/machine/Memory.js";
import {MODE_ABSOLUTE, Mos6502} from "../../../../src/common/machine/mos6502.js";
import {Tracer} from "../../../../src/common/machine/sim/Tracer.js";
import {mem, mockOffsetDescriptor} from "../util.js";

const brk = Mos6502.ISA.byName("BRK")!.getBytes()[0];
const nop = Mos6502.ISA.byName("NOP")!.getBytes()[0];
const jmpAbs = Mos6502.ISA.byNameAndMode("JMP", MODE_ABSOLUTE)!.getBytes()[0];

describe("tracer", () => {
  it("runs then stops at BRK", () => {
    const machineCode: number[] = [
      0, 0, // base address 0x0000
      brk,
    ];
    const fb = FileBlob.fromBytes("testblob", machineCode, LE);
    const dm = new DisassemblyMetaImpl(0, [mockOffsetDescriptor()], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const t = new Tracer(d, [mockOffsetDescriptor(0, "root")], mem(machineCode), (_: Addr) => false);
    expect(t.countActiveThreads() == 1, "should begin with 1 thread");
    expect(t.running(), "tracer should have started running");
    t.step();
    expect(!t.running(), "tracer should be stopped after hitting break");
    expect(t.countActiveThreads() == 1, "should end with 1 thread");
  });

  it("records executed locations", () => {
    const bytes: number[] = [
      0, 0, // base address 0x0000
      nop, nop, brk
    ];
    const fb = FileBlob.fromBytes("testblob", bytes, LE);
    const dm = new DisassemblyMetaImpl(0, [mockOffsetDescriptor()], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const t = new Tracer(d, [mockOffsetDescriptor(0, "root")], ArrayMemory.zeroes(0x1000, LE, true, true));
    expect(t.executedAddresses().length === 0, "should have executed none");
    t.step();
    expect(t.executedAddresses().length === 1);
    expect(t.executedAddresses()).to.have.members([0]);
    t.step();
    expect(t.executedAddresses().length === 2);
    expect(t.executedAddresses()).to.have.members([0, 1]);
    expect(t.running());
    t.step();
    expect(!t.running());
    expect(t.executedAddresses()).to.have.members([0, 1, 2]);
  });

  it("handles unconditional jump", () => {
    // little endian addresses
    const bytes: number[] = [
      0, 0,         // base address = $0000
      jmpAbs, 4, 0,   // $0000, $1001, $1002: JMP $1004
      brk,          // $0003      : BRK     ; stops here if no jump
      nop,          // $0004      : NOP     ; jump target
      brk,          // $0005      : BRK     ; intended stop
    ];
    const fb = FileBlob.fromBytes("testblob", bytes, LE);
    const dm = new DisassemblyMetaImpl(0, [mockOffsetDescriptor()], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const t = new Tracer(d, [mockOffsetDescriptor()], ArrayMemory.zeroes(0x1000, LE, true, true));
    t.step(); // execute JMP
    t.step(); // execute NOP
    t.step(); // execute BRK

    expect(t.executedAddresses()).to.not.have.members([0, 3], "JMP was ignored");
    expect(t.executedAddresses()).to.have.members([0, 4, 5]);
  });

  it("handles unconditional jump with base address", () => {
    const bytes: number[] = [
      0, 0x10,          // base address is $1000
      jmpAbs, 0x04, 0x10, // $1000, $1001, $1002 JMP $1004
      brk,              // $1003  stops here if no jump
      nop,              // $1004  jump target
      brk,              // $1005  intended stop
    ];
    const mem64k = ArrayMemory.zeroes(0x10000, LE, true, true);
    const fb = FileBlob.fromBytes("jump test", bytes, LE);
    const offsetBlobContent = 2;
    const offsetOfLoadAddress = 0;
    // reset = entry point
    const dm = new DisassemblyMetaImpl(offsetOfLoadAddress, [mockOffsetDescriptor()], offsetBlobContent);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const t = new Tracer(d, [mockOffsetDescriptor(0x1000, "root")], mem64k);
    t.step(); // execute JMP
    t.step(); // execute NOP
    t.step(); // execute BRK
    const executed = t.executedAddresses();
    expect(executed[0]).to.not.equal(2, "base address was ignored");
    expect(t.executedAddresses()).to.not.have.members([0x1000, 0x1003]);
    expect(t.executedAddresses()).to.have.members([0x1000, 0x1004, 0x1005], "expected execution of jump");
  });

  it("handles simple conditional jump", () => {
    const bytes: number[] = [
      0, 0x10,          // base address is $1000
      0xb0, 0x03,       // BCS #3    ; $1000
      jmpAbs, 0x06, 0x10, // JMP $1006 ; $1002, $1003, $1004
      nop,              // NOP       ; $1005  bcs target
      brk,              // BRK       ; $1006  jmp target stop
    ];
    const mem64k = ArrayMemory.zeroes(0x10000, LE, true, true);
    const fb = FileBlob.fromBytes("bcs test", bytes, LE);
    const offsetBlobContent = 2;
    const offsetOfLoadAddress = 0;
    const dm = new DisassemblyMetaImpl(offsetOfLoadAddress, [mockOffsetDescriptor()], offsetBlobContent);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const t = new Tracer(d, [mockOffsetDescriptor(0x1000, "root")], mem64k);
    t.stepAll(); // execute BCS, should split into two threads
    expect(t.countActiveThreads()).to.eq(2);
    t.stepAll(); // branched thread executes NOP, JMP thread executes BRK
    t.stepAll(); // execute BRK
    expect(t.executedAddresses()).to.have.members([0x1000, 0x1002, 0x1005, 0x1006]);
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
      const dm = new DisassemblyMetaImpl(0, [mockOffsetDescriptor(6)], offsetBlobContent);
      const d = new Disassembler(Mos6502.ISA, fb, dm);

      const initialPc = 0x1000;
      const entryPoints = dm.executionEntryPoints(fb);
      entryPoints.forEach(entryPoint => {
        console.log(`entry point ${entryPoint.name} address: 0x${entryPoint.index.toString(16)}`);
        expect(entryPoint.index).to.eq(0x1008);
      });
      new Tracer(d, [mockOffsetDescriptor(initialPc, "root")], mem64k)
    });
  })
});

export {};