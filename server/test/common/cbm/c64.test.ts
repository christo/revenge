import {expect} from "chai";
import * as fs from "fs";
import * as path from "node:path";
import {PRELOADS_DIR_C64} from "../../../src/routes/constants.js";

describe("c64", () => {

  it("sniff machine code with basic stub", () => {
    const filepath = path.join("..", "server", PRELOADS_DIR_C64, 'Gridrunner.prg');
    const buffer = fs.readFileSync(filepath);
    expect(buffer.length).to.equal(3143);
    // TODO finish implementation of sniffing as C64 prg with basic stub
  });
});
