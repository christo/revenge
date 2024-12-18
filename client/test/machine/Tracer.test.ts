import {assert} from 'chai';
import {FileBlob} from "../../src/machine/FileBlob";
import {ArrayMemory, LE} from "../../src/machine/core";
import {Mos6502} from "../../src/machine/mos6502";
import {Tracer} from "../../src/machine/Tracer";
import {Disassembler, JumpTargetFetcher, LabelsComments, SymbolTable} from "../../src/machine/asm";
import {DisassemblyMetaImpl} from "../../src/machine/DisassemblyMetaImpl";

describe.skip("tracer", () => {
  it("performs simple linear trace", () => {
    const i = Mos6502.INSTRUCTIONS;
    const machineCode = Mos6502.builder()
        .opMap["brk"]([]) // TODO implement this
        .build();
    const fb = new FileBlob("testblob", machineCode, LE);
    const st = new SymbolTable("empty");
    const jtf: JumpTargetFetcher = fakeJumpTargetFetcher;
    const dm = new DisassemblyMetaImpl(0, 0, 0, [], jtf, st);
    const d = new Disassembler(i, fb, dm);
    const t = new Tracer(d, 0, mem(machineCode));
    assert(t.running());
  });
});

function mem(contents: number[]) {
  return new ArrayMemory(contents, LE, true, true);
}

const fakeJumpTargetFetcher: JumpTargetFetcher = (fb: FileBlob) => {
  return [[123, new LabelsComments()]]
}


export {};