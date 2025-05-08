import {expect} from 'chai';
import * as R from "ramda";

describe('Simple test', () => {
  it('should pass basic equality test', () => {
    expect(1).to.equal(1);
  });
  it("ramda to debug github actions ugh", () => {
    expect(R.max(0, 1)).to.equal(1);
  })
});