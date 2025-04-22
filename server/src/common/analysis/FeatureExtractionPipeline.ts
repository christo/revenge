import fs from "fs";
import path from "path";
import {FileLike} from "../FileLike";
import {EntropyExtractor} from "./EntropyExtractor";
import {FeatureExtractor} from "./FeatureExtractor";
import {HistogramExtractor} from "./HistogramExtractor";

class FeaturePipeline {
  private extractors: FeatureExtractor[] = [];

  add(extractor: FeatureExtractor): void {
    this.extractors.push(extractor);
  }

  extractFromFile(filePath: string): [string, number][] {
    const numbers = new FileLike(path.basename(filePath), Array.from(fs.readFileSync(filePath)));
    const featureVectors: [string, number][][] = this.extractors.map(extractor =>
        extractor.extract(numbers)
    );

    return featureVectors.flat();
  }
}

function defaultPipeline() {
  const pipeline = new FeaturePipeline();
  pipeline.add(new HistogramExtractor());
  pipeline.add(new EntropyExtractor());
  return pipeline;
}

export {FeaturePipeline, defaultPipeline};