import { FileLike } from "../FileLike.js";
import { FeatureExtractor } from "./FeatureExtractor.js";
import { Bigram } from "./Bigram.js";

/**
 * Extracts feature vectors based on byte pair (bigram) patterns in the data
 * These patterns are highly distinctive for different file formats
 */
export class BigramExtractor implements FeatureExtractor {
  private static readonly FEATURE_PREFIX = "bigram_";
  
  // Number of top bigrams to consider as features
  private readonly topBigramsCount: number;
  
  /**
   * Creates a new BigramExtractor
   * @param topBigramsCount Number of most frequent bigrams to include (default: 16)
   */
  constructor(topBigramsCount: number = 16) {
    this.topBigramsCount = topBigramsCount;
  }
  
  /**
   * Extract bigram-based features from a file
   * @param file File to analyze
   * @returns Array of [feature_name, value] tuples
   */
  extract(file: FileLike): [string, number][] {
    // Check if file has enough bytes for bigram analysis
    if (file.data.length < 2) {
      return [];
    }
    
    // Generate bigram analysis
    const bigram = new Bigram(this.fileLikeToByteableAdapter(file));
    
    // Track top bigrams by frequency
    const topBigrams: Array<{ first: number, second: number, count: number }> = [];
    
    // Collect all non-zero bigrams
    bigram.forEach((first, second, count) => {
      if (count > 0) {
        // Keep track of only the most frequent bigrams
        this.updateTopBigrams(topBigrams, first, second, count);
      }
    });
    
    // Convert top bigrams to feature tuples
    const features: [string, number][] = [];
    
    // Add total bigram count feature
    let totalCount = 0;
    for (const { count } of topBigrams) {
      totalCount += count;
    }
    features.push([`${BigramExtractor.FEATURE_PREFIX}total_count`, totalCount]);
    
    // Add individual top bigram features
    for (const { first, second, count } of topBigrams) {
      const featureName = `${BigramExtractor.FEATURE_PREFIX}${first.toString(16).padStart(2, '0')}_${second.toString(16).padStart(2, '0')}`;
      features.push([featureName, count]);
      
      // Also add normalized version
      features.push([`${featureName}_norm`, totalCount > 0 ? count / totalCount : 0]);
    }
    
    // Calculate bigram entropy/distribution features
    // Higher values indicate more uniform distribution of bigrams (less structure)
    let bigramVariance = 0;
    let nonZeroBigrams = 0;
    
    bigram.forEach((_, __, count) => {
      if (count > 0) {
        nonZeroBigrams++;
        // Calculate variance component for distribution analysis
        const normalizedCount = totalCount > 0 ? count / totalCount : 0;
        bigramVariance += Math.pow(normalizedCount, 2);
      }
    });
    
    features.push([`${BigramExtractor.FEATURE_PREFIX}unique_count`, nonZeroBigrams]);
    features.push([`${BigramExtractor.FEATURE_PREFIX}distribution`, bigramVariance]);
    
    return features;
  }
  
  /**
   * Updates the list of top bigrams, maintaining only the most frequent
   */
  private updateTopBigrams(
    topBigrams: Array<{ first: number, second: number, count: number }>,
    first: number,
    second: number,
    count: number
  ): void {
    // If we haven't reached capacity, just add it
    if (topBigrams.length < this.topBigramsCount) {
      topBigrams.push({ first, second, count });
      
      // Sort by count (descending)
      topBigrams.sort((a, b) => b.count - a.count);
      return;
    }
    
    // Check if this bigram should replace the least frequent one
    const leastFrequentIndex = topBigrams.length - 1;
    if (count > topBigrams[leastFrequentIndex].count) {
      topBigrams[leastFrequentIndex] = { first, second, count };
      // Sort by count (descending)
      topBigrams.sort((a, b) => b.count - a.count);
    }
  }
  
  /**
   * Adapts FileLike to Byteable interface for Bigram class
   */
  private fileLikeToByteableAdapter(file: FileLike) {
    return {
      getBytes: () => file.data,
      getLength: () => file.size,
      read8: (offset: number) => file.data[offset] || 0,
      byteString: () => file.data.map(b => b.toString(16).padStart(2, '0')).join(' ')
    };
  }
}