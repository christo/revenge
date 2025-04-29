import {expect} from "chai";
import fs from "fs";
import * as path from "node:path";
import {PRELOADS_DIR_C64} from "../../../../server/src/routes/constants.ts";

describe("c64", () => {

  it("sniff machine code with basic stub", () => {
    const filepath = path.join("..", "server", PRELOADS_DIR_C64, 'Gridrunner.prg');
    const buffer = fs.readFileSync(filepath);
    expect(buffer.length).to.equal(3143);
    // TODO finish implementation of sniffing as C64 prg with basic stub
  });
});
