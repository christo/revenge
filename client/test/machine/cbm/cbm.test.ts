import {expect} from "chai";
import * as fs from "fs";
import {Disassembler} from "../../../src/machine/asm/Disassembler";
import {DisassemblyMetaImpl} from "../../../src/machine/asm/DisassemblyMetaImpl";
import {InstructionLike} from "../../../src/machine/asm/instructions";
import {FileBlob} from "../../../src/machine/FileBlob";
import {Mos6502} from "../../../src/machine/mos6502";


describe("disassembler integration", () => {
  it("loads hesmon", () => {
    const hesmon = fs.readFileSync("../server/data/preload/HesMon.prg");
    const fb = FileBlob.fromBytes("hesmon", Array.from(hesmon), Mos6502.ENDIANNESS);
    const dm = new DisassemblyMetaImpl(0, [[0, "test"]], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const lines: InstructionLike[] = [];
    while (d.hasNext()) {
      lines.push(d.nextInstructionLine());
    }
    expect(lines.length).to.equal(1944); // includes *=$a000 directive
  });
})