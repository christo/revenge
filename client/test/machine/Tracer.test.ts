import {assert, expect} from 'chai';
import {FileBlob} from "../../src/machine/FileBlob";
import {ArrayMemory, LE} from "../../src/machine/core";
import {Mos6502} from "../../src/machine/mos6502";
import {Tracer} from "../../src/machine/Tracer";
import {Disassembler} from "../../src/machine/asm/Disassembler";
import {DisassemblyMetaImpl} from "../../src/machine/asm/DisassemblyMetaImpl";
import {JumpTargetFetcher, LabelsComments} from "../../src/machine/asm/asm";

describe("tracer", () => {
  it("stops at break", () => {
    const machineCode: number[] = [
        0, 0, // base address 0x0000
        ...Mos6502.ISA.byName("BRK").getBytes(),
    ];
    const fb = new FileBlob("testblob", machineCode, LE);
    const dm = new DisassemblyMetaImpl(0, 0, 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const t = new Tracer(d, 0, mem(machineCode));
    expect(t.threads.length == 1, "should begin with 1 thread");
    expect(t.running(), "tracer should have started running");
    t.step();
    expect(!t.running(), "tracer should be stopped after hitting break");
    expect(t.threads.length == 1, "should end with 1 thread");
  });
});

function mem(contents: number[]) {
  return new ArrayMemory(contents, LE, true, true);
}

const fakeJumpTargetFetcher: JumpTargetFetcher = (fb: FileBlob) => {
  return [[123, new LabelsComments()]]
}


export {};