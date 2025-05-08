import {expect} from "chai";
import * as fs from "fs";
import {CBM_BASIC_2_0} from "../../../src/common/machine/cbm/BasicDecoder.js";
import {LE, LittleEndian} from "../../../src/common/machine/Endian.js";
import {FileBlob} from "../../../src/common/machine/FileBlob.js";
import {LogicalLine} from "../../../src/common/machine/LogicalLine.js";
import {Memory} from "../../../src/common/machine/Memory.js";
import {Tag} from "../../../src/common/machine/Tag.js";

describe("basic decoder", () => {
  it("performs simple linear decode", () => {
    const fname = "data/preload/vic20/Killer Comet.prg";
    const buffer = fs.readFileSync(fname);

    let linesRead = 0;
    const fb = FileBlob.fromBytes(fname, Array.from(new Uint8Array(buffer)), LE);
    const fbm = fb.asMemory() as Memory<LittleEndian>;
    CBM_BASIC_2_0.decode(fbm).getLines().map((ll: LogicalLine) => ll.getTags()).map((t: Tag[]) => t[1]).forEach((_x: Tag) => {
      linesRead++;
    })
    expect(linesRead).equal(38);
  })
});

export {}