import {expect} from "chai";
import {splitStringByLength} from '../src/binaryToTsBase64';

describe('splitStringOnLength', () => {
  it('should split string into chunks of specified length', () => {
    expect(splitStringByLength('abcdef', 2)).to.deep.equal(['ab', 'cd', 'ef']);
    expect(splitStringByLength('abcdefg', 2)).to.deep.equal(['ab', 'cd', 'ef', 'g']);
  });

  it('should return empty array for empty string', () => {
    expect(splitStringByLength('', 2)).to.deep.equal([]);
  });

  it('should return original string as single element for length greater than string', () => {
    expect(splitStringByLength('abc', 5)).to.deep.equal(['abc']);
  });

  it('should handle length of 1 correctly', () => {
    expect(splitStringByLength('abc', 1)).to.deep.equal(['a', 'b', 'c']);
  });
});