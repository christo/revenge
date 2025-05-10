import {FileLike} from "../../FileLike.js";
import {FeatureExtractor} from "./FeatureExtractor.js";

/**
 * Try to cover a range of expected file sizes.
 */
const HARD_MAX: [string, number][] = [
  ["root_length_1024k", 1024 * 1024],
  ["root_length_512k", 512 * 1024],
  ["root_length_256k", 256 * 1024],
  ["root_length_128k", 128 * 1024],
  ["root_length_64k", 64 * 1024],
  ["root_length_32k", 32 * 1024],
  ["root_length_16k", 16 * 1024],
  ["root_length_8k", 8 * 1024],
  ["root_length_4k", 4 * 1024],
  ["root_length_2k", 2 * 1024],
  ["root_length_1k", 1 * 1024],
];

/**
 * Experimental Feature Extractor based on the root of normalised values clamped to different maxima.
 */
class LengthExtractor implements FeatureExtractor {
  /**
   * Returns a descriptive string of this extractor and its configuration
   */
  descriptor(): string {
    return `LengthExtractor\nSize Thresholds: ${HARD_MAX.length}`;
  }

  extract(fileLike: FileLike): [string, number][] {
    return HARD_MAX.map(kv => [kv[0], Math.sqrt(Math.min(fileLike.size, kv[1]) / kv[1])])
  }
}

export {LengthExtractor};