import {expect} from "chai";
import {Disassembler} from "../../../src/machine/asm/Disassembler";
import {Mos6502} from "../../../src/machine/mos6502";
import * as fs from "fs";
import {DisassemblyMetaImpl} from "../../../src/machine/asm/DisassemblyMetaImpl";
import {FileBlob} from "../../../src/machine/FileBlob";
import {LE} from "../../../src/machine/core";
import {InstructionLike} from "../../../src/machine/asm/instructions";


describe("disassembler integration", () => {
  it("loads hesmon", () => {
    const hesmon = fs.readFileSync("../server/data/preload/HesMon.prg");
    const dm = new DisassemblyMetaImpl(0, 0, 2);
    const f = Array.from(hesmon);
    const d = new Disassembler(Mos6502.ISA, FileBlob.fromBytes("hesmon", f, LE), dm);
    const lines: InstructionLike[] = [];
    while (d.hasNext()) {
      lines.push(d.nextInstructionLine());
    }
    expect(lines.length).to.equal(1944);
  });
})