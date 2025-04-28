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

}