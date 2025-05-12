import {expect} from "chai";
import * as fs from "fs";
import * as path from "node:path";
import {C64StubSniffer} from "../../../src/common/machine/cbm/C64StubSniffer";
import {FileBlob} from "../../../src/common/machine/FileBlob";
import {ArrayMemory} from "../../../src/common/machine/Memory";
import {Mos6502} from "../../../src/common/machine/mos6502";
import {PRELOADS_DIR_C64} from "../../../src/constants.js";

describe("c64", () => {

  it("sniff machine code with basic stub", () => {
    const filename = 'Gridrunner.prg';
    const filepath = path.join("..", "server", PRELOADS_DIR_C64, filename);
    const buffer = fs.readFileSync(filepath);
    const fb = FileBlob.fromBytes(filename, Array.from(buffer), Mos6502.ENDIANNESS);
    expect(buffer.length).to.equal(3143);
    const c64StubSniffer = new C64StubSniffer();
    const stench = c64StubSniffer.sniff(fb);
    expect(stench.score).gte(100);
  });
});
