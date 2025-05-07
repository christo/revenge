import {expect} from "chai";
import * as fs from "fs";
import {CBM_BASIC_2_0} from "../../../src/machine/cbm/BasicDecoder.ts";
import {LE, LittleEndian} from "../../../../server/src/common/machine/Endian.ts";
import {FileBlob} from "../../../../server/src/common/machine/FileBlob.ts";
import {Memory} from "../../../../server/src/common/machine/Memory.ts";

describe("basic decoder", () => {
  it("performs simple linear decode", () => {
    const fname = "data/Killer Comet.prg";
    const buffer = fs.readFileSync(fname);

    let linesRead = 0;
    const fb = FileBlob.fromBytes(fname, Array.from(new Uint8Array(buffer)), LE);
    const fbm = fb.asMemory() as Memory<LittleEndian>;
    CBM_BASIC_2_0.decode(fbm).getLines().map((ll) => ll.getTags()).map(t => t[1]).forEach(_x => {
      linesRead++;
    })
    expect(linesRead).equal(38);
  })
});

export {}