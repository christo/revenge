import {Tracer} from "./tracer";
import {Disassembler, DisassemblyMetaImpl, SymbolTable} from "./asm";
import {Mos6502} from "./mos6502";
import {FileBlob} from "./FileBlob";
import {ArrayMemory, LE} from "./core";

function mem(contents: number[]) {
    return new ArrayMemory(contents, LE, true, true);
}
/*

test('simple linear trace', () => {
    const i = Mos6502.INSTRUCTIONS;
    const machineCode = i.builder()
        .brk()
        .build();
    const fb = new FileBlob("testblob", machineCode, LE);
    const st = new SymbolTable("empty");
    const jtf =
    const dm = new DisassemblyMetaImpl(0, 0, 0, [], jtf, st);
    const d = new Disassembler(i, fb, dm);
    const t = new Tracer(d, 0, mem(machineCode));
    expect(t.running()).toBe(true);
});
*/

export {};