import {expect} from 'chai';

import {AssemblyMeta} from "../../../../src/common/machine/asm/AssemblyMeta.js";
import {RevengeDialect} from "../../../../src/common/machine/asm/RevengeDialect.js";
import {SymbolTable} from "../../../../src/common/machine/asm/SymbolTable.js";
import {Mos6502} from "../../../../src/common/machine/mos6502.js";

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
