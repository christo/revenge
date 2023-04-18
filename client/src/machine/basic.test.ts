import * as fs from "fs";
import {CBM_BASIC_2_0} from "./basic";
import {LE} from "./core";
import {FileBlob} from "./FileBlob";

test("basic load", () => {
    const fname = "data/Killer Comet.prg";
    const buffer = fs.readFileSync(fname);

    let linesRead = 0;
    const fb = new FileBlob(fname, Array.from(new Uint8Array(buffer)), LE);
    CBM_BASIC_2_0.decode(fb).getLines().map((ll) => ll.getTags()).map(t => t[1]).forEach(x => {
        linesRead++;
    })
    expect(linesRead).toBe(38);
})

export {}