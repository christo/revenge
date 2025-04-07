import {expect} from 'chai';

import {AssemblyMeta} from "../../../src/machine/asm/AssemblyMeta.ts";
import {RevengeDialect} from "../../../src/machine/asm/RevengeDialect.ts";
import {SymbolTable} from "../../../src/machine/asm/SymbolTable.ts";
import {Mos6502} from "../../../src/machine/mos6502.ts";

describe("integration test using RevengeDialect and Mos6502 Instruction Set", () => {
  it("parses minimal absolute mode instruction", () => {
    const rd: RevengeDialect = new RevengeDialect();
    const st = new SymbolTable("empty");
    const am: AssemblyMeta = new AssemblyMeta(st, new Mos6502());
    const em = rd.parseInstructionPart("JMP $1234", am);
    const emission = em(am);
    expect(emission.error).to.equal(undefined, `emission error: ${emission.error}`);
    expect(emission.bytes).to.deep.equal([0x4c, 0x34, 0x12]);
  });
});
