import {expect} from "chai";
import * as fs from "fs";
import {PRELOADS_DIR_VIC20} from "../../../../server/src/routes/constants.ts";
import {Disassembler} from "../../../../server/src/common/machine/asm/Disassembler.ts";
import {DisassemblyMetaImpl} from "../../../../server/src/common/machine/asm/DisassemblyMetaImpl.ts";
import {trace} from "../../../../server/src/common/machine/cbm/cbm.ts";
import {FileBlob} from "../../../../server/src/common/machine/FileBlob.ts";
import {Mos6502} from "../../../../server/src/common/machine/mos6502.ts";
import {mockOffsetDescriptor} from "../../../../server/test/common/machine/util.ts";


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