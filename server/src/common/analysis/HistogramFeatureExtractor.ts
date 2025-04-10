import {FeatureExtractor} from "./FeatureExtractor";

/**
 * One dimensional n-gram feature extractor.
 */
export class HistogramFeatureExtractor implements FeatureExtractor {
  extract(buffer: number[]): [string, number][] {
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < buffer.length; i++) {
      histogram[buffer[i]]++;
    }
    // Normalize and label
    return histogram.map((count: number, i: number) => [`byte_${i}`, count / buffer.length]);
  }
}