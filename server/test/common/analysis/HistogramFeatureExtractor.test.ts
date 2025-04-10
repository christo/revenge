import {expect} from 'chai';
import {HistogramFeatureExtractor} from "../../../src/common/analysis/HistogramFeatureExtractor";
import {FileLike} from "../../../src/common/FileLike";

describe("histogram feature extractor", () => {
  it("handles simple binary case", () => {
    const hfe :HistogramFeatureExtractor = new HistogramFeatureExtractor();
    const buffer = [0, 0, 0, 0, 255];
    const features = hfe.extract(new FileLike("foobar", Uint8Array.from(buffer)));
    const byte255 = features.find(f => f[0] === `byte_255`);
    expect(byte255).not.to.equal(undefined);
    const byte0 = features.find(f => f[0] === `byte_0`);
    expect(byte0).not.to.equal(undefined);
    // there are more zeroes than 255s
    expect(byte255[1]).to.be.lt(byte0[1], "there were more zeroes than 255s bro");
  });
  it("calculates flat feature vector", () => {
    const hfe :HistogramFeatureExtractor = new HistogramFeatureExtractor();
    const twoOfEach = [0, 2, 4, 8, 4, 2, 0, 8];
    const features = hfe.extract(new FileLike("foobar", Uint8Array.from(twoOfEach)));
    const byte2 = features.find(f => f[0] === `byte_2`);
    expect(byte2).not.to.equal(undefined);
    const byte0 = features.find(f => f[0] === `byte_0`);
    expect(byte0).not.to.equal(undefined);
    // there are more zeroes than 255s
    expect(byte2[1]).to.equal(byte0[1]);
  });
});