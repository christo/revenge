import {expect} from "chai";
import {Petscii} from "../../src/machine/petscii";

test("petscii sanity test", () => {
  expect(Petscii.C64.vice.length).eql(256);
  expect(Petscii.C64.unicode.length).eql(256);
  expect(Petscii.C64.description.length).eql(256);
})

export {}