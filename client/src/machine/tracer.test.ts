import {Tracer} from "./tracer";
import {Disassembler, DisassemblyMetaImpl, JumpTargetFetcher, LabelsComments, SymbolTable} from "./asm";
import {Mos6502} from "./mos6502";
import {FileBlob} from "./FileBlob";
import {Addr, ArrayMemory, LE} from "./core";

function mem(contents: number[]) {
    return new ArrayMemory(contents, LE, true, true);
}

const fakeJumpTargetFetcher: JumpTargetFetcher = (fb: FileBlob) => {
    return [[123, new LabelsComments()]]
}

/**
 * WIP TODO
 */
test.skip('simple linear trace', () => {
    const i = Mos6502.INSTRUCTIONS;
    const machineCode = Mos6502.builder()
        .opMap.brk([0]) // TODO hack todo
        .build();
    const fb = new FileBlob("testblob", machineCode, LE);
    const st = new SymbolTable("empty");
    const jtf: JumpTargetFetcher = fakeJumpTargetFetcher;
    const dm = new DisassemblyMetaImpl(0, 0, 0, [], jtf, st);
    const d = new Disassembler(i, fb, dm);
    const t = new Tracer(d, 0, mem(machineCode));
    expect(t.running()).toBe(true);
});

export {};