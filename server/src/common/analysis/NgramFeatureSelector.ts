/**
 * Feature selection strategies for n-grams to reduce the dimensionality
 * of the feature space while retaining discriminative power.
 */
export class NgramFeatureSelector {
  /**
   * Selects features based on term frequency–inverse document frequency (TF-IDF)
   * This helps identify n-grams that are important in a specific file but not common across all files
   * 
   * @param ngramFrequencies Map of n-gram keys to their counts in the current file
   * @param documentFrequencies Map of n-gram keys to the number of documents containing them
   * @param totalDocuments Total number of documents in the corpus
   * @param limit Maximum number of features to select
   * @returns Array of [key, score] pairs sorted by TF-IDF score (descending)
   */
  static selectByTfidf(
    ngramFrequencies: Map<string, number>,
    documentFrequencies: Map<string, number>,
    totalDocuments: number,
    limit: number
  ): [string, number][] {
    const tfidfScores: [string, number][] = [];
    
    // Calculate the maximum frequency for normalization
    const maxFreq = Math.max(...ngramFrequencies.values());
    
    // Calculate TF-IDF for each n-gram
    for (const [key, count] of ngramFrequencies.entries()) {
      // Term frequency (normalized)
      const tf = count / (maxFreq || 1);
      
      // Get document frequency (number of documents containing this n-gram)
      const df = documentFrequencies.get(key) || 0;
      
      // Inverse document frequency
      const idf = Math.log((totalDocuments + 1) / (df + 1)) + 1; // Add 1 for smoothing
      
      // TF-IDF score
      const tfidf = tf * idf;
      
      tfidfScores.push([key, tfidf]);
    }
    
    // Sort by score (descending) and take top 'limit' features
    return tfidfScores
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
  
  /**
   * Entropy-based feature selection to identify n-grams with more information content
   * Higher entropy means more information content and potentially better discriminative power
   * 
   * @param ngramFrequencies Map of n-gram keys to their counts
   * @param totalCount Total count of all n-grams
   * @param limit Maximum number of features to select
   * @returns Array of [key, entropy] pairs sorted by entropy (descending)
   */
  static selectByEntropy(
    ngramFrequencies: Map<string, number>,
    totalCount: number,
    limit: number
  ): [string, number][] {
    const entropyScores: [string, number][] = [];
    
    for (const [key, count] of ngramFrequencies.entries()) {
      // Calculate probability of this n-gram
      const p = count / totalCount;
      
      // Calculate negative entropy contribution (-p * log2(p))
      const entropy = -p * Math.log2(p);
      
      entropyScores.push([key, entropy]);
    }
    
    // Sort by entropy (descending) and take top 'limit' features
    return entropyScores
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  // TODO use variance in pipeline
  /**
   * Feature selection based on variance across a corpus
   * N-grams with high variance may have more discriminative power
   * 
   * @param ngramFrequenciesByDocument Map of document IDs to maps of n-gram frequencies
   * @param limit Maximum number of features to select
   * @returns Array of [key, variance] pairs sorted by variance (descending)
   */
  static selectByVariance(
    ngramFrequenciesByDocument: Map<string, Map<string, number>>,
    limit: number
  ): [string, number][] {
    // First, collect all unique n-grams across all documents
    const allNgrams = new Set<string>();
    for (const frequencies of ngramFrequenciesByDocument.values()) {
      for (const key of frequencies.keys()) {
        allNgrams.add(key);
      }
    }
    
    // Calculate mean and variance for each n-gram
    const varianceScores: [string, number][] = [];
    const documentCount = ngramFrequenciesByDocument.size;
    
    for (const ngram of allNgrams) {
      let sum = 0;
      let sumSquared = 0;
      
      // Calculate sum and sum of squares for variance calculation
      for (const frequencies of ngramFrequenciesByDocument.values()) {
        const freq = frequencies.get(ngram) || 0;
        sum += freq;
        sumSquared += freq * freq;
      }
      
      // Calculate variance
      const mean = sum / documentCount;
      const variance = (sumSquared / documentCount) - (mean * mean);
      
      varianceScores.push([ngram, variance]);
    }
    
    // Sort by variance (descending) and take top 'limit' features
    return varianceScores
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
}