import {expect} from 'chai';
import {HistogramExtractor} from "../../../src/common/analysis/extractor/HistogramExtractor";
import {FileLike} from "../../../src/common/FileLike";

describe("histogram feature extractor", () => {
  it("handles simple binary case", () => {
    const hfe: HistogramExtractor = new HistogramExtractor();
    const buffer = [0, 0, 0, 0, 255];
    const features = hfe.extract(new FileLike("foobar", buffer));
    const byte255 = features.find(f => f[0] === `b_255`);
    expect(byte255).not.to.equal(undefined);
    const byte0 = features.find(f => f[0] === `b_0`);
    expect(byte0).not.to.equal(undefined);
    // there are more zeroes than 255s
    expect(byte255[1]).to.be.lt(byte0[1], "there were more zeroes than 255s bro");
  });
  it("calculates flat feature vector", () => {
    const hfe: HistogramExtractor = new HistogramExtractor();
    const twoOfEach = [0, 2, 4, 8, 4, 2, 0, 8];
    const features = hfe.extract(new FileLike("foobar", twoOfEach));
    const byte2 = features.find(f => f[0] === `b_2`);
    expect(byte2).not.to.equal(undefined);
    const byte0 = features.find(f => f[0] === `b_0`);
    expect(byte0).not.to.equal(undefined);
    // there are more zeroes than 255s
    expect(byte2[1]).to.equal(byte0[1]);
  });
});