import * as fs from 'fs';
import * as path from 'path';
import {
  BinaryClassifierEnsemble,
  DataCollector,
  EvaluationResults,
  ModelEvaluator
} from './common/analysis/classifier/index.js';
import {appendToReport, generateReport, generateTrainingReport} from "./common/analysis/classifier/reportGenerator.js";
import {
  fullPipeline,
  defaultPipeline,
  ngramPipeline,
  enhancedSignaturePipeline,
  streamlinedNgramPipeline,
  balancedPlatformPipeline,
  FeaturePipeline
} from './common/analysis/FeatureExtractionPipeline.js';

// Directory containing platform-specific files
const TRAINING_PATH = path.resolve('./data/training');
// Directory for saving analysis data
const ANALYSIS_DIR = path.resolve('./data/analysis');
// Output model path
const MODEL_PATH = path.resolve('./data/analysis/binary_classifier_model.json');
// Output evaluation report path
const REPORT_PATH = path.resolve('./data/analysis/classification_report.txt');

/**
 * Main function to train and evaluate the classifier
 */
async function main() {
  const outerStartTime = Date.now();
  console.log('Binary File Type Classification');
  console.log('==============================');

  // Select pipeline based on command line argument
  const pipelineType = process.argv[2] || 'full';
  const pipeline = selectPipeline(pipelineType);

  console.log(`\nUsing '${pipelineType}' feature extraction pipeline`);

  // Ensure analysis directory exists
  if (!fs.existsSync(ANALYSIS_DIR)) {
    fs.mkdirSync(ANALYSIS_DIR, {recursive: true});
  }

  console.log(`\nCollecting training data from ${TRAINING_PATH}...`);

  // Use the selected feature pipeline
  const collector = new DataCollector(pipeline);

  // Build training data from file corpus
  const completeData = await collector.buildTrainingData(TRAINING_PATH);

  console.log(`\nFound ${completeData.features.size} files across ${new Set(completeData.fileTypes.values()).size} platforms`);

  // Split data into training (80%) and testing (20%) sets
  const {training, testing} = collector.splitTrainingTestData(completeData, 0.2);

  console.log(`\nTraining with ${training.features.size} files, testing with ${testing.features.size} files`);

  // Train the ensemble classifier
  console.log('\nTraining classifier ensemble...');
  const classifier = new BinaryClassifierEnsemble();
  const startTime = Date.now();
  await classifier.trainEnsemble(training);
  const trainTime = Date.now() - startTime;
  console.log(`Training completed in ${(trainTime / 1000).toFixed(2)} seconds`);

  // Save the trained model
  await classifier.saveModel(MODEL_PATH);
  console.log(`\nModel saved to ${MODEL_PATH}`);

  // Evaluate model performance
  console.log('\nEvaluating classifier performance...');
  const evaluator = new ModelEvaluator();
  const results = await evaluator.evaluate(classifier, testing);

  // Generate and display evaluation report
  let report = generateTrainingReport(pipeline, trainTime, evaluator, results, MODEL_PATH);
  console.log('\n' + report);

  // Save the report - append to existing report if it exists
  appendToReport(REPORT_PATH, report);
  console.log(`\nEvaluation report saved to ${REPORT_PATH}`);

  // Example prediction
  const exampleFiles = findExampleFiles(TRAINING_PATH);
  if (exampleFiles.length > 0) {
    console.log('\nExample predictions:');
    for (const filePath of exampleFiles) {
      const features = pipeline.extractFromFile(filePath);
      const prediction = await classifier.predict(features);

      // Get actual platform from directory name
      const platform = path.basename(path.dirname(filePath));
      const fileName = path.basename(filePath);
      const result = prediction.label === platform ? '✓' : '✗';

      console.log(`${result} ${fileName} (${platform}): predicted as ${prediction.label} with ${(prediction.confidence * 100).toFixed(1)}% confidence`);
    }
  }
  console.log(`\nTotal time: ${((Date.now() - outerStartTime) / 1000).toFixed(2)} seconds`);
}

/**
 * Select pipeline based on type string
 * @param type Pipeline type name
 * @returns The selected feature pipeline
 */
function selectPipeline(type: string): FeaturePipeline {
  switch (type.toLowerCase()) {
    case 'default':
      return defaultPipeline();
    case 'ngram':
      return ngramPipeline();
    case 'signature':
      return enhancedSignaturePipeline();
    case 'streamlined':
      return streamlinedNgramPipeline();
    case 'balanced':
      return balancedPlatformPipeline();
    case 'full':
    default:
      return fullPipeline();
  }
}

/**
 * Find a few example files for prediction demonstration
 * @param baseDir Base directory containing platform files
 * @returns Array of file paths to use as examples
 */
function findExampleFiles(baseDir: string): string[] {
  const examples: string[] = [];
  const platforms = fs.readdirSync(baseDir);

  // Get one example from each platform
  for (const platform of platforms) {
    const platformDir = path.join(baseDir, platform);
    if (!fs.statSync(platformDir).isDirectory()) {
      continue;
    }

    const files = fs.readdirSync(platformDir);
    if (files.length > 0) {
      // Pick a random file from this platform
      const randomIndex = Math.floor(Math.random() * files.length);
      examples.push(path.join(platformDir, files[randomIndex]));

      // Limit to 5 examples
      if (examples.length >= 5) {
        break;
      }
    }
  }

  return examples;
}

// Run the main function
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});