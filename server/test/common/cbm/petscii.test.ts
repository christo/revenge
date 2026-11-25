import {expect} from "chai";
import {Petscii} from "../../../src/common/machine/cbm/petscii.js";

test("petscii sanity test", () => {
  expect(Petscii.C64.vice.length).eql(256);
  expect(Petscii.C64.unicode.length).eql(256);
  expect(Petscii.C64.description.length).eql(256);
})

test("petscii codes returns the code of each char", () => {
  const codes = Petscii.codes("A1Z");
  const chars = codes.map(c => Petscii.C64.vice[c]);
  expect(chars).eql(["A", "1", "Z"]);
})

export {}