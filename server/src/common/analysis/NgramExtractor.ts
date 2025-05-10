import {FileLike} from "../FileLike.js";
import {Ngram} from "./Ngram.js";
import {FeatureExtractor} from "./FeatureExtractor.js";
import {NgramFeatureSelector} from "./NgramFeatureSelector.js";

/**
 * Extracts feature vectors based on n-gram patterns in data
 * Can identify more complex patterns than simple byte frequencies or bigrams
 */
export class NgramExtractor implements FeatureExtractor {
  private static readonly FEATURE_PREFIX = "ngram_";

  // Length of n-grams to extract (default: 3 for trigrams)
  private readonly ngramLength: number;

  // Number of top n-grams to consider as features
  private readonly topNgramsCount: number;

  // Strategy for selecting important n-grams
  private readonly selectionStrategy: NgramSelectionStrategy;

  // Optional document frequency information for TF-IDF selection
  private documentFrequencies: Map<string, number> | null = null;
  private totalDocuments: number = 0;

  /**
   * Returns a descriptive string of this extractor and its configuration
   */
  descriptor(): string {
    const ngramName = this.ngramLength === 1 ? "Unigram" :
                      this.ngramLength === 2 ? "Bigram" :
                      this.ngramLength === 3 ? "Trigram" :
                      `${this.ngramLength}-gram`;

    let description = `NgramExtractor (${ngramName})`;
    description += `\nN-gram Length: ${this.ngramLength}`;
    description += `\nFeatures Count: ${this.topNgramsCount}`;
    description += `\nSelection Strategy: ${this.selectionStrategy}`;

    if (this.selectionStrategy === NgramSelectionStrategy.TFIDF && this.documentFrequencies) {
      description += `\nCorpus Documents: ${this.totalDocuments}`;
    }

    return description;
  }
  
  /**
   * Creates a new NgramExtractor
   * @param ngramLength Length of n-grams to extract (default: 3)
   * @param topNgramsCount Number of most frequent n-grams to include (default: 16)
   * @param selectionStrategy Strategy to select important n-grams (default: frequency-based)
   */
  constructor(
    ngramLength: number = 3,
    topNgramsCount: number = 16,
    selectionStrategy: NgramSelectionStrategy = NgramSelectionStrategy.FREQUENCY
  ) {
    if (ngramLength < 1) {
      throw new Error("n-gram length must be at least 1");
    }
    
    this.ngramLength = ngramLength;
    this.topNgramsCount = topNgramsCount;
    this.selectionStrategy = selectionStrategy;
  }
  
  /**
   * Set corpus statistics for more advanced feature selection methods
   * @param documentFrequencies Map of n-gram keys to the number of documents containing them
   * @param totalDocuments Total number of documents in the corpus
   */
  setCorpusStatistics(
    documentFrequencies: Map<string, number>,
    totalDocuments: number
  ): void {
    this.documentFrequencies = documentFrequencies;
    this.totalDocuments = totalDocuments;
  }
  
  /**
   * Extract n-gram-based features from a file
   * @param file File to analyze
   * @returns Array of [feature_name, value] tuples
   */
  extract(file: FileLike): [string, number][] {
    // Check if file has enough bytes for n-gram analysis
    if (file.data.length < this.ngramLength) {
      return [];
    }
    
    // Generate n-gram analysis
    const ngram = new Ngram(file.toByteable(), this.ngramLength);
    
    // Get features based on the selection strategy
    const features: [string, number][] = [];
    
    // Add basic n-gram statistics
    features.push([`${NgramExtractor.FEATURE_PREFIX}total_count`, ngram.getTotalCount()]);
    features.push([`${NgramExtractor.FEATURE_PREFIX}unique_count`, ngram.getUniqueCount()]);
    
    // Add diversity metric (ratio of unique n-grams to total)
    const diversity = ngram.getTotalCount() > 0 
      ? ngram.getUniqueCount() / ngram.getTotalCount() 
      : 0;
    features.push([`${NgramExtractor.FEATURE_PREFIX}diversity`, diversity]);
    
    // Get total count for calculations below
    const totalCount = ngram.getTotalCount();
    
    // Create a map of n-gram frequencies for feature selection
    const ngramFrequencies = new Map<string, number>();
    ngram.forEach((bytes, count) => {
      const key = bytes.map(b => b.toString(16).padStart(2, '0')).join('_');
      ngramFrequencies.set(key, count);
    });
    
    // Calculate distribution metrics - higher values indicate more skewed distribution
    // (less uniform, more structure)
    let ngramVariance = 0;
    
    for (const count of ngramFrequencies.values()) {
      const normalizedCount = totalCount > 0 ? count / totalCount : 0;
      ngramVariance += Math.pow(normalizedCount, 2);
    }
    
    features.push([`${NgramExtractor.FEATURE_PREFIX}distribution`, ngramVariance]);
    
    // Select significant n-grams based on the strategy
    let selectedNgrams: [string, number][] = [];
    
    switch (this.selectionStrategy) {
      case NgramSelectionStrategy.FREQUENCY:
        // Simple frequency-based selection
        selectedNgrams = Array.from(ngramFrequencies.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, this.topNgramsCount);
        break;
        
      case NgramSelectionStrategy.ENTROPY:
        // Entropy-based selection
        selectedNgrams = NgramFeatureSelector.selectByEntropy(
          ngramFrequencies,
          totalCount,
          this.topNgramsCount
        );
        break;
        
      case NgramSelectionStrategy.TFIDF:
        // TF-IDF based selection
        if (this.documentFrequencies && this.totalDocuments > 0) {
          selectedNgrams = NgramFeatureSelector.selectByTfidf(
            ngramFrequencies,
            this.documentFrequencies,
            this.totalDocuments,
            this.topNgramsCount
          );
        } else {
          // Fall back to frequency-based if corpus stats aren't available
          selectedNgrams = Array.from(ngramFrequencies.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.topNgramsCount);
        }
        break;
    }
    
    // Add features for the selected n-grams
    this.addSignificantNgramFeatures(features, selectedNgrams, totalCount);
    
    return features;
  }
  
  /**
   * Add features for the most significant n-grams
   * @param features Feature array to append to
   * @param selectedNgrams Array of [key, value] tuples for selected n-grams
   * @param totalCount Total n-gram count for normalization
   */
  private addSignificantNgramFeatures(
    features: [string, number][],
    selectedNgrams: [string, number][],
    totalCount: number
  ): void {
    for (const [key, value] of selectedNgrams) {
      // Use a readable feature name with the n-gram key
      const featureName = `${NgramExtractor.FEATURE_PREFIX}${key}`;
      
      // For frequency-based selection, the value is the count
      if (this.selectionStrategy === NgramSelectionStrategy.FREQUENCY) {
        const count = value;
        
        // Add absolute count
        features.push([featureName, count]);
        
        // Also add normalized version
        features.push([`${featureName}_norm`, totalCount > 0 ? count / totalCount : 0]);
      } else {
        // For other selection strategies, the value is a score (entropy, tf-idf, etc.)
        // Add the score directly
        features.push([featureName, value]);
        
        // For TF-IDF, we don't need to normalize since it's already a relative measure
        if (this.selectionStrategy === NgramSelectionStrategy.ENTROPY) {
          // For entropy, we can normalize by the max possible entropy (log2(totalCount))
          const maxEntropy = Math.log2(totalCount || 1);
          features.push([`${featureName}_norm`, maxEntropy > 0 ? value / maxEntropy : 0]);
        }
      }
    }
  }
}

/**
 * Strategies for selecting important n-grams as features
 */
export enum NgramSelectionStrategy {
  // Select n-grams based on their frequency
  FREQUENCY = "frequency",
  
  // Select based on information entropy (information content)
  ENTROPY = "entropy",
  
  // Select based on TF-IDF (term frequency-inverse document frequency)
  TFIDF = "tfidf"
}