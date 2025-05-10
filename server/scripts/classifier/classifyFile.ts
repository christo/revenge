/**
 * Command-line tool to classify individual binary files
 *
 * Usage:
 *   cd server
 *   bun scripts/classifier/classifyFile.ts <file-path>
 */

import * as fs from 'fs';
import * as path from 'path';
import {BinaryClassifierEnsemble} from '../../src/common/analysis/classifier/index.js';
import {fullPipeline} from '../../src/common/analysis/extractor/FeatureExtractionPipeline.js';

// Path to the trained model
const MODEL_PATH = path.resolve('./data/analysis/binary_classifier_model.json');

/**
 * Main function to classify a binary file
 */
async function main() {
  // Get the file path from the command line arguments
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('Usage: bun scripts/classifier/classifyFile.ts <file-path>');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  // Check if the model exists
  if (!fs.existsSync(MODEL_PATH)) {
    console.error(`Model not found: ${MODEL_PATH}`);
    console.error('Please run trainClassifier.ts first to create the model.');
    process.exit(1);
  }

  try {
    // Load the trained model
    const classifier = new BinaryClassifierEnsemble();
    await classifier.loadModel(MODEL_PATH);

    console.log(`Classifying: ${path.basename(filePath)}`);

    // Extract features from the file
    const features = fullPipeline().extractFromFile(filePath);

    // Get prediction
    const prediction = await classifier.predict(features);

    // Display the results
    console.log('\nClassification Results:');
    console.log(`Primary classification: ${prediction.label}`);
    console.log(`Confidence: ${(prediction.confidence * 100).toFixed(2)}%`);

    // Display all class probabilities
    console.log('\nAll Classifications:');

    // Sort results by confidence
    const sortedScores = Array.from(prediction.allScores.entries())
        .sort((a, b) => b[1] - a[1]);

    // Display as a simple bar chart
    const maxBarLength = 40;
    for (const [className, score] of sortedScores) {
      const barLength = Math.round(score * maxBarLength);
      const bar = '█'.repeat(barLength) + '░'.repeat(maxBarLength - barLength);
      console.log(`${className.padEnd(15)} ${(score * 100).toFixed(2).padStart(6)}% ${bar}`);
    }

    // Provide feature information
    console.log('\nTop Features:');
    const featureEntries = Object.entries(Object.fromEntries(features));
    // Filter out zero-value features and sort by absolute value
    const topFeatures = featureEntries
        .filter(([_, value]) => value !== 0)
        .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))
        .slice(0, 10);

    for (const [name, value] of topFeatures) {
      console.log(`${name.padEnd(30)} ${value}`);
    }

  } catch (error) {
    console.error('Error classifying file:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});