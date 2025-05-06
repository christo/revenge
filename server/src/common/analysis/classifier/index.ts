/**
 * Classifier module for binary file type classification
 * 
 * This module provides tools for classifying binary files based on 
 * statistical analysis and machine learning techniques.
 */

// Export main classes
export { BinaryClassifierEnsemble, type TrainingData, type PredictionResult } from './BinaryClassifierEnsemble.js';
export { DataCollector } from './DataCollector.js';
export { ModelEvaluator, type EvaluationResults } from './ModelEvaluator.js';

// Example usage:
/*
// 1. Create a data collector
import { DataCollector, BinaryClassifierEnsemble, ModelEvaluator } from './classifier/index.js';
import { fullPipeline } from '../FeatureExtractionPipeline.js';

// Use the full feature pipeline with all extractors
const collector = new DataCollector(fullPipeline());

// 2. Build training data from corpus
const data = await collector.buildTrainingData('./server/data/preload');

// 3. Split into training and testing sets
const { training, testing } = collector.splitTrainingTestData(data);

// 4. Train the ensemble classifier
const ensemble = new BinaryClassifierEnsemble();
await ensemble.trainEnsemble(training);

// 5. Evaluate performance
const evaluator = new ModelEvaluator();
const results = await evaluator.evaluate(ensemble, testing);
console.log(evaluator.generateReport(results));

// 6. Save the trained model
await ensemble.saveModel('./server/data/analysis/binary_classifier_model.json');

// 7. Predict a new file's type
const filePath = './server/data/preload/vic20/Avenger.prg';
const features = fullPipeline().extractFromFile(filePath);
const prediction = await ensemble.predict(features);
console.log(`Predicted: ${prediction.label} with confidence ${prediction.confidence.toFixed(4)}`);
*/