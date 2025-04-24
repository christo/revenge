import {expect} from 'chai';
import {decodeBase64, encodeBase64} from "../../../src/common/analysis/base64";

describe("simple base64", () => {
  it("decodes small text input", () => {
    const textInput = "this text is input to base64 encoding";
    // obtained from system base64 command
    const expectedBase64 = "dGhpcyB0ZXh0IGlzIGlucHV0IHRvIGJhc2U2NCBlbmNvZGluZw==";
    const bytes = new TextEncoder().encode(textInput);
    expect(encodeBase64(Uint8Array.from(bytes))).to.equal(expectedBase64);
  });
  it("does round trip binary literal", () => {
    const bytesInput = Uint8Array.from([0xde, 0xad, 0xbe, 0xef, 0xca, 0xfe, 0xba, 0xbe]);
    const encoded = encodeBase64(bytesInput);
    // obtained from system base64 command
    const expectedBase64 = "3q2+78r+ur4=";
    expect(encoded).to.equal(expectedBase64);
    const decoded = decodeBase64(encoded);
    expect(decoded).to.deep.equal(bytesInput);
  })
});