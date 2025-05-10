import fs from "fs";
import path from "path";
import {FileLike} from "../../FileLike.js";
import {BigramExtractor} from "./BigramExtractor.js";
import {EnhancedSignatureExtractor} from "./EnhancedSignatureExtractor.js";
import {EntropyExtractor} from "./EntropyExtractor.js";
import {FeatureExtractor} from "./FeatureExtractor.js";
import {HistogramExtractor} from "./HistogramExtractor.js";
import {LengthExtractor} from "./LengthExtractor.js";
import {LoadAddressExtractor} from "./LoadAddressExtractor.js";
import {NgramExtractor, NgramSelectionStrategy} from "./NgramExtractor.js";

/**
 * Pipeline for extracting multiple feature sets from files
 */
class FeaturePipeline {
  private extractors: FeatureExtractor[] = [];

  /**
   * Add a feature extractor to the pipeline
   * @param extractor Feature extractor to add
   */
  add(extractor: FeatureExtractor): void {
    this.extractors.push(extractor);
  }

  /**
   * Extract all features from a file
   * @param filePath Path to the file
   * @returns Combined feature vector
   */
  extractFromFile(filePath: string): [string, number][] {
    const numbers = new FileLike(path.basename(filePath), Array.from(fs.readFileSync(filePath)));
    const featureVectors: [string, number][][] = this.extractors.map(extractor =>
        extractor.extract(numbers)
    );

    return featureVectors.flat();
  }

  /**
   * Extract all features from a file buffer
   * @param file FileLike object
   * @returns Combined feature vector
   */
  extractFromBuffer(file: FileLike): [string, number][] {
    const featureVectors: [string, number][][] = this.extractors.map(extractor =>
        extractor.extract(file)
    );

    return featureVectors.flat();
  }

  /**
   * Get names of all extractors in the pipeline
   */
  getExtractorNames(): string[] {
    return this.extractors.map(e => e.constructor.name);
  }

  /**
   * Get an extractor by its class type
   * @param type Constructor type to find
   * @returns The found extractor instance or undefined if not found
   */
  getExtractorByType<T extends FeatureExtractor>(type: new (...args: any[]) => T): T | undefined {
    for (const extractor of this.extractors) {
      if (extractor instanceof type) {
        return extractor as T;
      }
    }
    return undefined;
  }

  /**
   * Returns a detailed description of the pipeline configuration
   * Includes descriptions of all feature extractors
   * @returns String describing the pipeline configuration
   */
  descriptor(): string {
    const lines: string[] = ['=== Feature Extraction Pipeline ==='];
    lines.push(`Total Extractors: ${this.extractors.length}`);
    lines.push('');

    for (let i = 0; i < this.extractors.length; i++) {
      lines.push(`[${i + 1}] ${this.extractors[i].descriptor()}`);
      if (i < this.extractors.length - 1) {
        lines.push('');  // Add blank line between extractors
      }
    }

    return lines.join('\n');
  }
}

/**
 * Create a pipeline with the default feature extractors
 * @returns Configured feature pipeline
 */
function defaultPipeline(): FeaturePipeline {
  const pipeline = new FeaturePipeline();
  pipeline.add(new HistogramExtractor());
  pipeline.add(new EntropyExtractor());
  pipeline.add(new LengthExtractor());
  return pipeline;
}

/**
 * Create a pipeline with all available feature extractors
 * @returns Fully configured feature pipeline
 */
function fullPipeline(): FeaturePipeline {
  const pipeline = new FeaturePipeline();
  pipeline.add(new HistogramExtractor());
  pipeline.add(new EntropyExtractor());
  pipeline.add(new LengthExtractor());
  pipeline.add(new BigramExtractor());
  pipeline.add(new EnhancedSignatureExtractor());
  pipeline.add(new NgramExtractor(3, 30, NgramSelectionStrategy.FREQUENCY));
  return pipeline;
}

/**
 * Create a pipeline optimized for detailed n-gram analysis
 * @returns N-gram focused feature pipeline
 */
function ngramPipeline(): FeaturePipeline {
  const pipeline = new FeaturePipeline();
  pipeline.add(new HistogramExtractor());
  pipeline.add(new LengthExtractor());
  
  // Add different n-gram sizes with different selection strategies
  pipeline.add(new NgramExtractor(2, 16, NgramSelectionStrategy.FREQUENCY)); // Bigrams
  pipeline.add(new NgramExtractor(3, 16, NgramSelectionStrategy.FREQUENCY)); // Trigrams
  pipeline.add(new NgramExtractor(4, 12, NgramSelectionStrategy.ENTROPY));  // 4-grams with entropy selection
  
  return pipeline;
}

/**
 * Create a pipeline with only the enhanced signature extractor
 * Useful for quick platform identification without the overhead of other extractors
 * @returns Signature-focused feature pipeline
 */
function enhancedSignaturePipeline(): FeaturePipeline {
  const pipeline = new FeaturePipeline();
  pipeline.add(new EnhancedSignatureExtractor());
  return pipeline;
}

/**
 * Create a streamlined pipeline optimized for n-gram analysis and performance
 * Uses n-gram extractors to replace redundant features
 * @returns Optimized n-gram feature pipeline
 */
function streamlinedNgramPipeline(): FeaturePipeline {
  const pipeline = new FeaturePipeline();

  // Keep these non-n-gram features as they provide different information
  pipeline.add(new EntropyExtractor());
  pipeline.add(new LengthExtractor());
  pipeline.add(new EnhancedSignatureExtractor());

  // Replace histogram (n=1) and bigram (n=2) with n-gram extractors
  // Use entropy selection for better feature quality
  pipeline.add(new NgramExtractor(1, 16, NgramSelectionStrategy.ENTROPY)); // Replace histogram
  pipeline.add(new NgramExtractor(2, 16, NgramSelectionStrategy.ENTROPY)); // Replace bigram

  // Add higher-order n-grams that might capture instruction patterns
  pipeline.add(new NgramExtractor(3, 16, NgramSelectionStrategy.ENTROPY)); // Complete instructions
  pipeline.add(new NgramExtractor(4, 12, NgramSelectionStrategy.ENTROPY)); // Instruction sequences

  return pipeline;
}

/**
 * Create a balanced pipeline specifically optimized for VIC20/C64 distinction
 * Uses load address information from machine definitions and optimized feature selection
 * @returns Feature pipeline optimized for balanced platform classification
 */
function balancedPlatformPipeline(): FeaturePipeline {
  const pipeline = new FeaturePipeline();

  // Add specialized load address extractor that uses platform-specific constants
  pipeline.add(new LoadAddressExtractor());

  // Add the core signal extractors
  pipeline.add(new EntropyExtractor());
  pipeline.add(new LengthExtractor());

  // Add the signature extractor with platform-specific signatures
  pipeline.add(new EnhancedSignatureExtractor());

  // Add optimized n-gram extractors with entropy-based selection
  pipeline.add(new NgramExtractor(1, 10, NgramSelectionStrategy.ENTROPY)); // Unigrams
  pipeline.add(new NgramExtractor(2, 10, NgramSelectionStrategy.ENTROPY)); // Bigrams
  pipeline.add(new NgramExtractor(3, 16, NgramSelectionStrategy.ENTROPY)); // Bigrams

  return pipeline;
}

export {
  FeaturePipeline,
  defaultPipeline,
  fullPipeline,
  ngramPipeline,
  enhancedSignaturePipeline,
  streamlinedNgramPipeline,
  balancedPlatformPipeline
};