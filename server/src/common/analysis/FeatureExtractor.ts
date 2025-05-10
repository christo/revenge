import {FileLike} from "../FileLike.js";

/**
 * Calculates feature vector for statistical analysis of byte array contents.
 */
export interface FeatureExtractor {
  /**
   * Normalised vector calculated for each named feature.
   * @param buffer array of bytes
   */
  extract(buffer: FileLike): [string, number][];

  /**
   * Returns a descriptive string of the extractor and its configuration parameters
   * Used for logging and reporting the pipeline configuration
   */
  descriptor(): string;
}