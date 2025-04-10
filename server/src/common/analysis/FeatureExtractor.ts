export interface FeatureExtractor {
  extract(buffer: Buffer): number[];
  getFeatureNames(): string[];
}