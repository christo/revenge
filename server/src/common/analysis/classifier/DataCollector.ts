import fs from 'fs';
import path from 'path';
import { FileLike } from '../../FileLike.js';
import { FeaturePipeline, defaultPipeline } from '../FeatureExtractionPipeline.js';
import { TrainingData } from './BinaryClassifierEnsemble.js';

/**
 * Collects and processes binary files for training classifiers
 */
export class DataCollector {
  private pipeline: FeaturePipeline;
  
  /**
   * Create a new DataCollector with specified feature pipeline
   * @param pipeline Feature extraction pipeline to use
   */
  constructor(pipeline?: FeaturePipeline) {
    this.pipeline = pipeline || defaultPipeline();
  }
  
  /**
   * Build training data from files in structured directories
   * @param baseDir Base directory containing platform-specific subdirectories
   * @returns Training data for classifier
   */
  async buildTrainingData(baseDir: string): Promise<TrainingData> {
    const features = new Map<string, [string, number][]>();
    const fileTypes = new Map<string, string>();
    
    // Process each platform directory
    for (const platform of fs.readdirSync(baseDir)) {
      const platformDir = path.join(baseDir, platform);
      if (!fs.statSync(platformDir).isDirectory()) continue;
      
      console.log(`Processing ${platform} files...`);
      
      // Process each file in the platform directory
      for (const file of fs.readdirSync(platformDir)) {
        const filePath = path.join(platformDir, file);
        if (!fs.statSync(filePath).isFile()) continue;
        
        try {
          // Create unique file ID
          const fileId = `${platform}_${file}`;
          
          // Extract features
          const fileFeatures = this.pipeline.extractFromFile(filePath);
          features.set(fileId, fileFeatures);
          fileTypes.set(fileId, platform);
          
          console.log(`  Processed ${file}`);
        } catch (error) {
          console.error(`Error processing ${filePath}: ${error}`);
        }
      }
    }
    
    console.log(`Collected ${features.size} files across ${new Set(fileTypes.values()).size} platforms`);
    return { features, fileTypes };
  }
  
  /**
   * Split data into training and testing sets
   * @param data Full dataset
   * @param testRatio Ratio of data to use for testing (0-1)
   * @returns Split data sets
   */
  splitTrainingTestData(data: TrainingData, testRatio: number = 0.2): { 
    training: TrainingData, 
    testing: TrainingData 
  } {
    const fileIds = Array.from(data.features.keys());
    const trainingFeatures = new Map<string, [string, number][]>();
    const trainingTypes = new Map<string, string>();
    const testingFeatures = new Map<string, [string, number][]>();
    const testingTypes = new Map<string, string>();
    
    // Group by class to ensure stratified split
    const classSamples: Map<string, string[]> = new Map();
    for (const fileId of fileIds) {
      const fileType = data.fileTypes.get(fileId)!;
      if (!classSamples.has(fileType)) {
        classSamples.set(fileType, []);
      }
      classSamples.get(fileType)!.push(fileId);
    }
    
    // Split each class according to ratio
    for (const [classType, samples] of classSamples.entries()) {
      // Shuffle samples
      const shuffled = [...samples].sort(() => Math.random() - 0.5);
      
      // Calculate split index
      const testCount = Math.max(1, Math.round(shuffled.length * testRatio));
      const testSamples = shuffled.slice(0, testCount);
      const trainSamples = shuffled.slice(testCount);
      
      console.log(`Class ${classType}: ${trainSamples.length} train, ${testSamples.length} test`);
      
      // Add to respective sets
      for (const id of trainSamples) {
        trainingFeatures.set(id, data.features.get(id)!);
        trainingTypes.set(id, classType);
      }
      
      for (const id of testSamples) {
        testingFeatures.set(id, data.features.get(id)!);
        testingTypes.set(id, classType);
      }
    }
    
    return {
      training: { features: trainingFeatures, fileTypes: trainingTypes },
      testing: { features: testingFeatures, fileTypes: testingTypes }
    };
  }
  
  /**
   * Save training data to a JSON file
   * @param data Training data
   * @param filePath File path to save to
   */
  saveTrainingData(data: TrainingData, filePath: string): void {
    const serializable = {
      features: Array.from(data.features.entries()),
      fileTypes: Array.from(data.fileTypes.entries())
    };
    
    fs.writeFileSync(filePath, JSON.stringify(serializable, null, 2));
  }
  
  /**
   * Load training data from a JSON file
   * @param filePath File path to load from
   * @returns Training data
   */
  loadTrainingData(filePath: string): TrainingData {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    return {
      features: new Map(data.features),
      fileTypes: new Map(data.fileTypes)
    };
  }
}