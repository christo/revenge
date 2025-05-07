import fs from "fs";
import path from "path";
import {FileLike} from "../FileLike.js";
import {BigramExtractor} from "./BigramExtractor.js";
import {EntropyExtractor} from "./EntropyExtractor.js";
import {FeatureExtractor} from "./FeatureExtractor.js";
import {HistogramExtractor} from "./HistogramExtractor.js";
import {LengthExtractor} from "./LengthExtractor.js";
import {SignatureExtractor} from "./SignatureExtractor.js";
import {EnhancedSignatureExtractor} from "./EnhancedSignatureExtractor.js";

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

export {FeaturePipeline, defaultPipeline, fullPipeline, enhancedSignaturePipeline};