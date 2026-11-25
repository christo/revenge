import {expect} from "chai";
import {RomImage} from "../../../src/common/machine/RomImage.js";

describe("RomImage", () => {
  it("read8 returns the byte value, not a truthiness mask", () => {
    const bytes = [0x00, 0x01, 0x7f, 0x80, 0xff];
    const rom = new RomImage("test", 0, bytes);
    expect(bytes.map((_, i) => rom.read8(i))).to.eql(bytes);
  });
});
