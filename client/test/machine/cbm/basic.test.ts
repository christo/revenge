import * as fs from "fs";
import {expect} from "chai";
import {CBM_BASIC_2_0} from "../../../src/machine/cbm/BasicDecoder.ts";
import {LE} from "../../../src/machine/Endian.ts";
import {FileBlob} from "../../../src/machine/FileBlob.ts";

describe("basic decoder", () => {
  it("performs simple linear decode", () => {
    const fname = "data/Killer Comet.prg";
    const buffer = fs.readFileSync(fname);

    let linesRead = 0;
    const fb = FileBlob.fromBytes(fname, Array.from(new Uint8Array(buffer)), LE);
    CBM_BASIC_2_0.decode(fb.asEndian()).getLines().map((ll) => ll.getTags()).map(t => t[1]).forEach(_x => {
      linesRead++;
    })
    expect(linesRead).equal(38);
  })
});

export {}