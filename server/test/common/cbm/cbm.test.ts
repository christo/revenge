import {expect} from "chai";
import * as fs from "fs";
import {Disassembler} from "../../../src/common/machine/asm/Disassembler.js";
import {DisassemblyMetaImpl} from "../../../src/common/machine/asm/DisassemblyMetaImpl.js";

import {trace} from "../../../src/common/machine/dynamicAnalysis";
import {FileBlob} from "../../../src/common/machine/FileBlob.js";
import {Mos6502} from "../../../src/common/machine/mos6502.js";
import {PRELOADS_DIR_VIC20} from "../../../src/constants.js";
import {mockOffsetDescriptor} from "../machine/util.js";


describe("disassembler integration", () => {
  it("traces avenger", () => {
    const f = fs.readFileSync(`../server/${PRELOADS_DIR_VIC20}/Avenger.prg`);
    const fb = FileBlob.fromBytes("Avenger", Array.from(f), Mos6502.ENDIANNESS);
    const dm = new DisassemblyMetaImpl(0, [mockOffsetDescriptor(2, "entry")], 2);
    const d = new Disassembler(Mos6502.ISA, fb, dm);
    const traceResult = trace(d, fb, dm);
    expect(traceResult.steps).to.eq(1140);
    expect(traceResult.executedInstructions.length).to.eq(1140);
  })
})