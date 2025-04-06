import {expect} from "chai";
import * as fs from "fs";
import {Disassembler} from "../../../src/machine/asm/Disassembler.ts";
import {DisassemblyMetaImpl} from "../../../src/machine/asm/DisassemblyMetaImpl.ts";
import {InstructionLike} from "../../../src/machine/asm/instructions.ts";
import {trace} from "../../../src/machine/cbm/cbm.ts";
import {FileBlob} from "../../../src/machine/FileBlob.ts";
import {Mos6502} from "../../../src/machine/mos6502.ts";


describe("disassembler integration", () => {
  it("loads hesmon", () => {
    const f = fs.readFileSync("../server/data/preload/vic20/HesMon.prg");
    const fb = FileBlob.fromBytes("hesmon", Array.from(f), Mos6502.ENDIANNESS);
    const dm = new DisassemblyMetaImpl(0, [[0, "test"]], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const lines: InstructionLike[] = [];
    while (d.hasNext()) {
      lines.push(d.nextInstructionLine()!);
    }
    expect(lines.length).to.equal(1944); // includes *=$a000 directive
  });

  it("traces avenger", () => {
    const f = fs.readFileSync("../server/data/preload/vic20/Avenger.prg");
    const fb = FileBlob.fromBytes("Avenger", Array.from(f), Mos6502.ENDIANNESS);
    const dm = new DisassemblyMetaImpl(0, [[2, "entry"]], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const traceResult = trace(d,fb, dm);
    expect(traceResult.steps).to.eq(1140);
    expect(traceResult.executedInstructions.length).to.eq(1140);
  })
})