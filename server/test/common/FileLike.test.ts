import {expect} from "chai";
import {FileLike} from "../../src/common/FileLike.js";

describe("FileLike", () => {
  it("read8 returns the byte value, not a truthiness mask", () => {
    const bytes = [0x00, 0x01, 0x7f, 0x80, 0xff];
    const byteable = new FileLike("test", bytes).toByteable();
    expect(bytes.map((_, i) => byteable.read8(i))).to.eql(bytes);
  });
});
