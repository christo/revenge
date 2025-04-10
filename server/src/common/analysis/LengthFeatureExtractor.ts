import {FileLike} from "../FileLike";
import {FeatureExtractor} from "./FeatureExtractor";

class LengthFeatureExtractor implements FeatureExtractor {
  extract(fileLike: FileLike): [string, number][] {
    return [["length", fileLike.size]];
  }
}