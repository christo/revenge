import {FileBlob, FileLike} from "./FileBlob";
import {BasicDecoder, CBM_BASIC_2_0} from "./basic";
import * as fs from "fs";

test("basic load", () => {
    const fname = "data/Killer Comet.prg";
    const buffer = fs.readFileSync(fname);

    let linesRead = 0;
    const fb = new FileBlob(fname, buffer.length, buffer);
    CBM_BASIC_2_0.decode(fb).map(t => t[1]).forEach(x => {
        linesRead++;
    })
    expect(linesRead).toBe(38);
})

export {}