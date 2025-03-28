import * as fs from "fs";
import {expect} from "chai";
import {CBM_BASIC_2_0} from "../../../src/machine/cbm/BasicDecoder";
import {FileBlob} from "../../../src/machine/FileBlob";
import {LE} from "../../../src/machine/core";

describe("tracer", () => {
  it("performs simple linear trace", () => {
    const fname = "data/Killer Comet.prg";
    const buffer = fs.readFileSync(fname);

    let linesRead = 0;
    const fb = FileBlob.fromBytes(fname, Array.from(new Uint8Array(buffer)), LE);
    CBM_BASIC_2_0.decode(fb).getLines().map((ll) => ll.getTags()).map(t => t[1]).forEach(x => {
      linesRead++;
    })
    expect(linesRead).equal(38);
  })
});

export {}