import {Byteable} from "../Byteable";

/**
 * Implements a frequency distribution for byte pair occurrences in the
 * provided byte sequence.
 */
export class Bigram {
  public readonly SIZE = 256;
  private readonly plot: number[][];
  private readonly min: number;
  private readonly max: number;

  constructor(input: Byteable) {
    this.min = Number.MAX_SAFE_INTEGER;
    this.max = 0;
    const bytes = input.getBytes();
    // initialise bigram grid to zero
    const size = this.SIZE;
    this.plot = Array.from({length: size}, () =>
        Array.from({length: size}, () => 0)
    );
    for (let i = 1; i < bytes.length; i++) {
      const first = bytes[i - 1];
      const second = bytes[i];
      if (first > 255 || second > 255 || first < 0 || second < 0) {
        throw Error("illegal state, byte value out of range"); // paranoia
      }
      const newVal = this.plot[first][second] + 1;
      this.max = Math.max(newVal, this.max);
      this.min = Math.min(newVal, this.min);
      this.plot[first][second] = newVal;
    }
  }

  /**
   * Visits every possible bigram (first and second) with the corresponding frequency of
   * occurrence and calls the provided function with each of these positive integers.
   * The number of calls will always be equal to SIZE*SIZE.
   * @param fn
   */
  forEach(fn: (first: number, second: number, value: number) => void) {
    for (let i = 0; i < this.SIZE; i++) {
      for (let j = 0; j < this.SIZE; j++) {
        fn(i, j, this.plot[i][j]);
      }
    }
  }

  // noinspection JSUnusedGlobalSymbols
  getMin() {
    return this.min;

  }

  getMax() {
    return this.max;
  }
}