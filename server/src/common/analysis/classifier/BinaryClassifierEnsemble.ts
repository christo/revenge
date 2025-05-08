import { Worker } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { FileLike } from "../../FileLike.js";
import { FeaturePipeline, defaultPipeline } from "../FeatureExtractionPipeline.js";

/**
 * Data structure for training machine learning models
 */
export interface TrainingData {
  features: Map<string, [string, number][]>;
  fileTypes: Map<string, string>;
}

/**
 * Prediction result from the classifier
 */
export interface PredictionResult {
  label: string;
  confidence: number;
  allScores: Map<string, number>;
}

/**
 * Ensemble of binary classifiers for file type classification
 * Uses a one-vs-rest approach to classify binary files
 */
export class BinaryClassifierEnsemble {
  private models: Map<string, any> = new Map();
  private classNames: string[] = [];
  private featureNames: string[] = [];
  private featureScaling: Map<string, { min: number; max: number }> = new Map();

  /**
   * Get list of class names (file types)
   */
  getClassNames(): string[] {
    return [...this.classNames];
  }

  /**
   * Get list of feature names
   */
  getFeatureNames(): string[] {
    return [...this.featureNames];
  }

  /**
   * Train the classifier ensemble on provided data
   * @param data Training data containing features and labels
   */
  async trainEnsemble(data: TrainingData): Promise<void> {
    // Extract unique class names
    this.classNames = [...new Set(Array.from(data.fileTypes.values()))];

    // Get consistent feature names and compute feature scaling parameters
    this.computeFeatureMetadata(data);

    // Convert features to normalised format
    const preparedData = this.prepareTrainingData(data);

    // Instead of TensorFlow, implement a simple classifier
    // Each class will have its own model comparing it to all other classes
    for (const className of this.classNames) {
      await this.trainClassifier(className, preparedData);
    }

    console.log(`Trained ${this.classNames.length} classifiers with ${this.featureNames.length} features`);
  }

  /**
   * Compute feature names and scaling parameters
   */
  private computeFeatureMetadata(data: TrainingData): void {
    // Get all feature names across all samples
    const allFeatureNames = new Set<string>();
    for (const features of data.features.values()) {
      for (const [name] of features) {
        allFeatureNames.add(name);
      }
    }
    this.featureNames = Array.from(allFeatureNames).sort();

    // Compute min/max for each feature for normalization
    const featureValues: Map<string, number[]> = new Map();
    for (const featureName of this.featureNames) {
      featureValues.set(featureName, []);
    }

    for (const featureTuples of data.features.values()) {
      const featureMap = new Map(featureTuples);
      for (const featureName of this.featureNames) {
        if (featureMap.has(featureName)) {
          featureValues.get(featureName)!.push(featureMap.get(featureName)!);
        }
      }
    }

    // Calculate min/max for each feature
    for (const featureName of this.featureNames) {
      const values = featureValues.get(featureName)!;
      const min = Math.min(...values);
      const max = Math.max(...values);
      this.featureScaling.set(featureName, { min, max });
    }
  }

  /**
   * Normalise features for consistent model input
   */
  private normaliseFeatures(featureTuples: [string, number][]): number[] {
    const featureMap = new Map(featureTuples);
    return this.featureNames.map(name => {
      const value = featureMap.has(name) ? featureMap.get(name)! : 0;
      const scaling = this.featureScaling.get(name)!;

      // Avoid division by zero
      if (scaling.max === scaling.min) {
        return value === scaling.min ? 0.5 : 0;
      }

      // Normalise to [0, 1]
      return (value - scaling.min) / (scaling.max - scaling.min);
    });
  }

  /**
   * Prepare training data for model training
   */
  private prepareTrainingData(data: TrainingData) {
    const fileIds = Array.from(data.features.keys());
    const preparedFeatures: number[][] = [];
    const preparedLabels: Map<string, number[]> = new Map();

    // Initialize label arrays for each class
    for (const className of this.classNames) {
      preparedLabels.set(className, []);
    }

    // Process each file's features
    for (const fileId of fileIds) {
      const featureTuples = data.features.get(fileId)!;
      const normalisedFeatures = this.normaliseFeatures(featureTuples);
      preparedFeatures.push(normalisedFeatures);

      // Set binary labels for each class
      const fileClass = data.fileTypes.get(fileId)!;
      for (const className of this.classNames) {
        preparedLabels.get(className)!.push(fileClass === className ? 1 : 0);
      }
    }

    return { features: preparedFeatures, labels: preparedLabels };
  }

  /**
   * Train a single binary classifier for one class
   */
  private async trainClassifier(className: string, preparedData: {
    features: number[][],
    labels: Map<string, number[]>
  }): Promise<void> {
    // Simple nearest centroid classifier
    const positiveIndices: number[] = [];
    const negativeIndices: number[] = [];

    // Find positive and negative samples
    const classLabels = preparedData.labels.get(className)!;
    for (let i = 0; i < classLabels.length; i++) {
      if (classLabels[i] === 1) {
        positiveIndices.push(i);
      } else {
        negativeIndices.push(i);
      }
    }

    // Calculate centroids for positive and negative classes
    const positiveCentroid = this.calculateCentroid(preparedData.features, positiveIndices);
    const negativeCentroid = this.calculateCentroid(preparedData.features, negativeIndices);

    // Store model
    this.models.set(className, {
      positiveCentroid,
      negativeCentroid,
      className
    });
  }

  /**
   * Calculate centroid of feature vectors
   */
  private calculateCentroid(features: number[][], indices: number[]): number[] {
    if (indices.length === 0) {
      return Array(features[0].length).fill(0);
    }

    const centroid = Array(features[0].length).fill(0);
    for (const idx of indices) {
      for (let i = 0; i < features[idx].length; i++) {
        centroid[i] += features[idx][i];
      }
    }

    // Average
    for (let i = 0; i < centroid.length; i++) {
      centroid[i] /= indices.length;
    }

    return centroid;
  }

  /**
   * Predict the class of a new file using its features
   * @param featureTuples Feature tuples from feature extractors
   */
  async predict(featureTuples: [string, number][]): Promise<PredictionResult> {
    const normalizedFeatures = this.normaliseFeatures(featureTuples);
    const scores = new Map<string, number>();

    // Calculate distances to each class centroid
    for (const className of this.classNames) {
      const model = this.models.get(className)!;
      const positiveDistance = this.euclideanDistance(normalizedFeatures, model.positiveCentroid);
      const negativeDistance = this.euclideanDistance(normalizedFeatures, model.negativeCentroid);

      // Higher score means closer to positive centroid and further from negative centroid
      let score;

      // Prevent division by zero and handle edge cases
      if (positiveDistance === 0 && negativeDistance === 0) {
        // If both distances are zero, the vector is equidistant
        score = 0.5;
      } else if (positiveDistance === 0) {
        // If positive distance is zero, max confidence
        score = 1.0;
      } else if (negativeDistance === 0) {
        // If negative distance is zero, min confidence
        score = 0.0;
      } else {
        // Normal case
        score = negativeDistance / (positiveDistance + negativeDistance);
      }

      // Ensure we never return NaN
      score = isNaN(score) ? 0.5 : score;

      scores.set(className, score);
    }

    // Find best class
    let bestClass = this.classNames[0];
    let bestScore = scores.get(bestClass)!;

    for (const className of this.classNames) {
      const score = scores.get(className)!;
      if (score > bestScore) {
        bestScore = score;
        bestClass = className;
      }
    }

    return {
      label: bestClass,
      confidence: bestScore,
      allScores: scores
    };
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      // Ensure values are valid numbers
      const aVal = isNaN(a[i]) ? 0 : a[i];
      const bVal = isNaN(b[i]) ? 0 : b[i];

      const diff = aVal - bVal;
      sum += diff * diff;
    }

    // Guard against unexpected math errors
    const result = Math.sqrt(sum);
    return isNaN(result) ? 0 : result;
  }

  /**
   * Save the trained model to disk
   */
  async saveModel(filePath: string): Promise<void> {
    const modelData = {
      classNames: this.classNames,
      featureNames: this.featureNames,
      featureScaling: Object.fromEntries(this.featureScaling.entries()),
      models: Array.from(this.models.entries())
    };

    fs.writeFileSync(filePath, JSON.stringify(modelData, null, 2));
  }

  /**
   * Load a trained model from disk
   */
  async loadModel(filePath: string): Promise<void> {
    const modelJson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    this.classNames = modelJson.classNames;
    this.featureNames = modelJson.featureNames;

    // Restore feature scaling
    this.featureScaling = new Map();
    for (const [key, value] of Object.entries(modelJson.featureScaling as Record<string, { min: number; max: number }>)) {
      this.featureScaling.set(key, value);
    }

    // Restore models
    this.models = new Map(modelJson.models);
  }
}