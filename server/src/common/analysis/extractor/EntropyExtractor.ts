import {FileLike} from "../../FileLike.js";
import {FeatureExtractor} from "./FeatureExtractor.js";

/**
 * Calculates entropy statistics.
 */
export class EntropyExtractor implements FeatureExtractor {
  private static readonly FEAT_GLOBAL_ENTROPY = 'global_entropy';

  private static readonly FEAT_MIN_WINDOW_ENTROPY = 'min_window_entropy';

  private static readonly FEAT_MAX_WINDOW_ENTROPY = 'max_window_entropy';

  private static readonly FEAT_MEAN_WINDOW_ENTROPY = 'mean_window_entropy';

  private static readonly FEAT_SD_WINDOW_ENTROPY = 'std_window_entropy';

  private readonly windowSize: number;

  constructor(windowSize: number = 256) {
    this.windowSize = windowSize;
  }

  /**
   * Returns a descriptive string of this extractor and its configuration
   */
  descriptor(): string {
    return `EntropyExtractor\nWindow Size: ${this.windowSize} bytes`;
  }

  extract(fileLike: FileLike): [string, number][] {
    const buffer = Array.from(fileLike.data);
    // Global entropy
    const globalEntropy = this.calculateEntropy(buffer);

    // Window entropy features
    const windowEntropies: number[] = [];
    for (let i = 0; i < buffer.length; i += this.windowSize) {
      const window = buffer.slice(i, i + this.windowSize);
      if (window.length >= this.windowSize / 2) { // Only process sufficiently large windows
        windowEntropies.push(this.calculateEntropy(window));
      }
    }

    // Return global entropy and stats about window entropy
    return [
      [EntropyExtractor.FEAT_GLOBAL_ENTROPY, globalEntropy],
      [EntropyExtractor.FEAT_MIN_WINDOW_ENTROPY, Math.min(...windowEntropies)],
      [EntropyExtractor.FEAT_MAX_WINDOW_ENTROPY, Math.max(...windowEntropies)],
      [EntropyExtractor.FEAT_MEAN_WINDOW_ENTROPY,
        windowEntropies.reduce((a, b) => a + b, 0) / windowEntropies.length], // mean
      [EntropyExtractor.FEAT_SD_WINDOW_ENTROPY, this.standardDeviation(windowEntropies)],
    ];
  }

  private calculateEntropy(buffer: number[]): number {
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < buffer.length; i++) {
      histogram[buffer[i]]++;
    }

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      const p = histogram[i] / buffer.length;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  private standardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(x => Math.pow(x - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }
}