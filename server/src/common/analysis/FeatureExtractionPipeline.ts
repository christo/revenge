import fs from "fs";
import path from "path";
import {FileLike} from "../FileLike";
import {FeatureExtractor} from "./FeatureExtractor";

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

    // Flatten the feature vectors
    return featureVectors.flat();
  }
}
