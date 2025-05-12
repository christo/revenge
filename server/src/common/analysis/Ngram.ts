import {Byteable} from "../Byteable.js";

/**
 * A general n-gram frequency counter that tracks sequences of n bytes
 * in the provided byte sequence.
 */
export class Ngram {
  public readonly SIZE = 256; // Byte values range from 0-255
  private readonly freqMap: Map<string, number>;
  private readonly n: number;
  private readonly min: number;
  private readonly max: number;
  private readonly totalCount: number;

  /**
   * Creates a new Ngram processor
   * @param input The byte data to analyze
   * @param n The length of n-grams to extract (default: 3)
   */
  constructor(input: Byteable, n: number = 3) {
    if (n < 1) {
      throw new Error("n-gram length must be at least 1");
    }

    this.min = Number.MAX_SAFE_INTEGER;
    this.max = 0;
    this.totalCount = 0;
    this.n = n;
    this.freqMap = new Map<string, number>();

    const bytes = input.getBytes();

    // We need at least n bytes to form an n-gram
    if (bytes.length < n) {
      return;
    }

    // Extract and count all n-grams
    for (let i = 0; i <= bytes.length - n; i++) {
      // Extract the n-gram sequence
      const ngramKey = this.bytesToKey(bytes.slice(i, i + n));

      // Count the frequency
      const currentCount = this.freqMap.get(ngramKey) || 0;
      const newCount = currentCount + 1;

      this.freqMap.set(ngramKey, newCount);
      this.totalCount++;

      // Track min/max counts
      this.min = Math.min(this.min, newCount);
      this.max = Math.max(this.max, newCount);
    }
  }

  /**
   * Get the n-gram length
   * @returns The length of n-grams being processed
   */
  getNgramLength(): number {
    return this.n;
  }

  /**
   * Get the total number of n-grams counted
   * @returns Total count of n-grams
   */
  getTotalCount(): number {
    return this.totalCount;
  }

  /**
   * Get the number of unique n-grams found
   * @returns Number of unique n-grams
   */
  getUniqueCount(): number {
    return this.freqMap.size;
  }

  /**
   * Get the minimum frequency found
   * @returns Minimum frequency value
   */
  getMin(): number {
    return this.min === Number.MAX_SAFE_INTEGER ? 0 : this.min;
  }

  /**
   * Get the maximum frequency found
   * @returns Maximum frequency value
   */
  getMax(): number {
    return this.max;
  }

  /**
   * Get the top n-grams by frequency
   * @param limit Maximum number of n-grams to return
   * @returns Array of [key, count] sorted by frequency (descending)
   */
  getTopNgrams(limit: number): [string, number][] {
    return Array.from(this.freqMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
  }

  /**
   * Execute a callback for each n-gram and its frequency
   * @param callback Function to call with n-gram bytes and count
   */
  forEach(callback: (bytes: number[], count: number) => void): void {
    for (const [key, count] of this.freqMap.entries()) {
      callback(this.keyToBytes(key), count);
    }
  }

  /**
   * Convert a byte array to a string key for the map
   * @param bytes Byte array representing an n-gram
   * @returns String key for map lookup
   */
  private bytesToKey(bytes: number[]): string {
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('_');
  }

  /**
   * Convert a string key back to byte array
   * @param key The string key to convert
   * @returns Array of byte values
   */
  private keyToBytes(key: string): number[] {
    return key.split('_').map(hex => parseInt(hex, 16));
  }
}