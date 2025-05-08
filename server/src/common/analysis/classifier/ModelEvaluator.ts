import {BinaryClassifierEnsemble, TrainingData} from './BinaryClassifierEnsemble.js';

/**
 * Results of model evaluation
 */
export interface EvaluationResults {
  accuracy: number;
  precision: Map<string, number>;
  recall: Map<string, number>;
  f1Score: Map<string, number>;
  confusionMatrix: Map<string, Map<string, number>>;
  totalSamples: number;
  classDistribution: Map<string, number>;
}

/**
 * Evaluates classifier performance on test data
 */
export class ModelEvaluator {
  /**
   * Evaluate a trained classifier on test data
   * @param ensemble Trained classifier ensemble
   * @param testData Test data set
   * @returns Evaluation metrics
   */
  async evaluate(ensemble: BinaryClassifierEnsemble, testData: TrainingData): Promise<EvaluationResults> {
    const classNames = ensemble.getClassNames();
    const fileIds = Array.from(testData.features.keys());
    let correctPredictions = 0;

    // Initialize confusion matrix
    const confusionMatrix: Map<string, Map<string, number>> = new Map();
    for (const actualClass of classNames) {
      confusionMatrix.set(actualClass, new Map());
      for (const predictedClass of classNames) {
        confusionMatrix.get(actualClass)!.set(predictedClass, 0);
      }
    }

    // Track class distribution in test set
    const classDistribution: Map<string, number> = new Map();
    for (const className of classNames) {
      classDistribution.set(className, 0);
    }

    // Make predictions for each test sample
    for (const fileId of fileIds) {
      const features = testData.features.get(fileId)!;
      const actualClass = testData.fileTypes.get(fileId)!;

      // Update class distribution
      classDistribution.set(actualClass, (classDistribution.get(actualClass) || 0) + 1);

      // Make prediction
      const prediction = await ensemble.predict(features);
      const predictedClass = prediction.label;

      // Update confusion matrix
      const current = confusionMatrix.get(actualClass)!.get(predictedClass)!;
      confusionMatrix.get(actualClass)!.set(predictedClass, current + 1);

      // Check if prediction is correct
      if (predictedClass === actualClass) {
        correctPredictions++;
      }
    }

    // Calculate accuracy
    const accuracy = correctPredictions / fileIds.length;

    // Calculate precision, recall, and F1 score for each class
    const precision: Map<string, number> = new Map();
    const recall: Map<string, number> = new Map();
    const f1Score: Map<string, number> = new Map();

    for (const className of classNames) {
      // True positives: confusionMatrix[className][className]
      const truePositives = confusionMatrix.get(className)!.get(className)!;

      // Calculate sum of each column (predicted as this class)
      let totalPredicted = 0;
      for (const actualClass of classNames) {
        totalPredicted += confusionMatrix.get(actualClass)!.get(className)!;
      }

      // Calculate sum of each row (actual instances of this class)
      let totalActual = 0;
      for (const predictedClass of classNames) {
        totalActual += confusionMatrix.get(className)!.get(predictedClass)!;
      }

      // Calculate precision: TP / (TP + FP)
      const classPrecision = totalPredicted > 0 ? truePositives / totalPredicted : 0;
      precision.set(className, classPrecision);

      // Calculate recall: TP / (TP + FN)
      const classRecall = totalActual > 0 ? truePositives / totalActual : 0;
      recall.set(className, classRecall);

      // Calculate F1 score: 2 * (precision * recall) / (precision + recall)
      const denominator = classPrecision + classRecall;
      const classF1 = denominator > 0 ? 2 * (classPrecision * classRecall) / denominator : 0;
      f1Score.set(className, classF1);
    }

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix,
      totalSamples: fileIds.length,
      classDistribution
    };
  }

  /**
   * Generate a human-readable report for evaluation results
   * @param results Evaluation results
   * @returns Formatted report
   */
  generateReport(results: EvaluationResults): string {
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
}