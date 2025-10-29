import {expect} from "chai";
import * as fs from "fs";
import {CBM_BASIC_2_0} from "../../../src/common/machine/cbm/BasicDecoder.js";
import {LE, LittleEndian} from "../../../src/common/machine/Endian.js";
import {FileBlob} from "../../../src/common/machine/FileBlob.js";
import {Memory} from "../../../src/common/machine/Memory.js";

describe("basic decoder", () => {
  it("performs simple linear decode", () => {
    const fname = "data/preload/vic20/Killer Comet.prg";
    const buffer = fs.readFileSync(fname);

    const fb = FileBlob.fromBytes(fname, Array.from(new Uint8Array(buffer)), LE);
    const fbm = fb.asMemory() as Memory<LittleEndian>;
    const decoded = CBM_BASIC_2_0.decode(fbm);
    const linesRead = decoded.getLines().length;

    expect(linesRead).equal(38);
  });
});

export {}