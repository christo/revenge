import {FileLike} from "../FileLike.js";
import {FeatureExtractor} from "./FeatureExtractor.js";

/**
 * One dimensional n-gram feature extractor.
 */
export class HistogramExtractor implements FeatureExtractor {
  /**
   * Returns a descriptive string of this extractor and its configuration
   */
  descriptor(): string {
    return "HistogramExtractor\nFeatures: 256 byte frequencies";
  }

  extract(fileLike: FileLike): [string, number][] {
    const buffer = Array.from(fileLike.data);
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < buffer.length; i++) {
      histogram[buffer[i]]++;
    }
    // Normalise and label
    return histogram.map((count: number, i: number) => [`b_${i}`, count / buffer.length]);
  }
}