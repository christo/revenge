import fs from "fs";
import {FeaturePipeline} from "../extractor/FeatureExtractionPipeline.js";
import {EvaluationResults, ModelEvaluator} from "./ModelEvaluator.js";

/**
 * Append new report to existing report file
 * @param reportPath Path to the report file
 * @param newReport New report content to append
 */
function appendToReport(reportPath: string, newReport: string): void {
  try {
    // Create divider
    const divider = '\n\n' + '='.repeat(50) + '\n\n';

    // Check if file exists to determine if we need to append or create
    if (fs.existsSync(reportPath)) {
      fs.appendFileSync(reportPath, divider + newReport);
    } else {
      fs.writeFileSync(reportPath, newReport);
    }
  } catch (err: any) {
    console.error(`Error writing report: ${err.message || err}`);
    // Fallback to writing a new file
    fs.writeFileSync(reportPath, newReport);
  }
}

/**
 * Generate a comprehensive training report
 * @param pipeline The feature pipeline used
 * @param trainingTime Training time in milliseconds
 * @param evaluator Model evaluator instance
 * @param results Evaluation results
 * @param modelPath Optional path to the saved model file to report its size
 * @returns Formatted report string
 */
function generateTrainingReport(
    pipeline: FeaturePipeline,
    trainingTime: number,
    evaluator: ModelEvaluator,
    results: any,
    modelPath?: string
): string {
  const timestamp = new Date().toISOString();
  const lines = [
    '=== Binary File Type Classification Report ===',
    `Timestamp: ${timestamp}`,
    `Training Time: ${(trainingTime / 1000).toFixed(2)} seconds`,
  ];

  // Add model size information if a model path is provided
  if (modelPath && fs.existsSync(modelPath)) {
    const stats = fs.statSync(modelPath);
    const modelSizeKB = (stats.size / 1024).toFixed(2);
    const modelSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    lines.push(`Model Size: ${modelSizeKB} KB (${modelSizeMB} MB)`);
  }

  lines.push('');

  // Add pipeline configuration
  lines.push(pipeline.descriptor());
  lines.push('');

  // Add standard evaluation report
  lines.push(generateReport(results));

  return lines.join('\n');
}

/**
 * Generate a human-readable report for evaluation results
 * @param results Evaluation results
 * @returns Formatted report
 */
function generateReport(results: EvaluationResults): string {
  const classNames = Array.from(results.classDistribution.keys()).sort();
  let report = '=== Binary File Type Classification Report ===\n\n';

  // Overall accuracy
  report += `Overall Accuracy: ${(results.accuracy * 100).toFixed(2)}% (${Math.round(results.accuracy * results.totalSamples)}/${results.totalSamples})\n\n`;

  // Class distribution
  report += 'Class Distribution:\n';
  for (const className of classNames) {
    const count = results.classDistribution.get(className)!;
    const percentage = (count / results.totalSamples * 100).toFixed(2);
    report += `  ${className}: ${count} samples (${percentage}%)\n`;
  }
  report += '\n';

  // Per-class metrics
  report += 'Per-Class Metrics:\n';
  report += 'Class        Precision  Recall     F1 Score\n';
  report += '-------------------------------------------\n';

  for (const className of classNames) {
    const precision = results.precision.get(className)!;
    const recall = results.recall.get(className)!;
    const f1 = results.f1Score.get(className)!;

    report += `${className.padEnd(12)} ${(precision * 100).toFixed(2).padStart(6)}%   `;
    report += `${(recall * 100).toFixed(2).padStart(6)}%   ${(f1 * 100).toFixed(2).padStart(6)}%\n`;
  }
  report += '\n';

  // Confusion matrix
  report += 'Confusion Matrix:\n';

  // Header row
  report += '        ';
  for (const className of classNames) {
    report += className.substring(0, 8).padStart(8);
  }
  report += '\n';

  // Matrix rows
  for (const actualClass of classNames) {
    report += actualClass.substring(0, 8).padEnd(8);

    for (const predictedClass of classNames) {
      const count = results.confusionMatrix.get(actualClass)!.get(predictedClass)!;
      report += `${count.toString().padStart(8)}`;
    }
    report += '\n';
  }

  return report;
}

export {generateReport, appendToReport, generateTrainingReport};