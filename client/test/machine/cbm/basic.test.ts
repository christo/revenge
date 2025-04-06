import * as fs from "fs";
import {expect} from "chai";
import {CBM_BASIC_2_0} from "../../../src/machine/cbm/BasicDecoder.ts";
import {LE, LittleEndian} from "../../../src/machine/Endian.ts";
import {FileBlob} from "../../../src/machine/FileBlob.ts";
import {Memory} from "../../../src/machine/Memory.ts";

describe("basic decoder", () => {
  it("performs simple linear decode", () => {
    const fname = "data/Killer Comet.prg";
    const buffer = fs.readFileSync(fname);

    let linesRead = 0;
    const fb = FileBlob.fromBytes(fname, Array.from(new Uint8Array(buffer)), LE);
    const fbm = fb.asEndian() as Memory<LittleEndian>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    CBM_BASIC_2_0.decode(fbm).getLines().map((ll) => ll.getTags()).map(t => t[1]).forEach(_x => {
      linesRead++;
    })
    expect(linesRead).equal(38);
  })
});

export {}