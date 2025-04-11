import {expect} from 'chai';
import {EntropyExtractor} from "../../../src/common/analysis/EntropyExtractor";
import {FileLike} from "../../../src/common/FileLike";

describe("entropy feature extractor", () => {
  it("scopres minimal entropy", () => {
    const fe = new EntropyExtractor();
    const buffer = [66, 66, 66, 66, 66];
    const features = fe.extract(new FileLike("foobar", Array.from(buffer)));

    expect(features.length).to.equal(5);

  });
  it("calculates high global entropy vector", () => {
    const fe = new EntropyExtractor(3);
    const buffer = [66, 66, 66, 66, 66];
    const features = fe.extract(new FileLike("foobar", Array.from(buffer)));

    const global = features[0];
    expect(global[0]).to.equal("global_entropy");
    // it should probably be exactly zero
    expect(global[1]).to.be.lt(0.01);
    const maxWindowEntropy = features[2];
    expect(maxWindowEntropy[0]).to.equal("max_window_entropy");
    // it should probably be exactly zero
    expect(maxWindowEntropy[1]).to.be.lt(0.01);
  });
});