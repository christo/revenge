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
      // Use the symbolic link flag available in Node.js 
      const stats = fs.statSync(platformDir, { throwIfNoEntry: false });
      if (!stats || !stats.isDirectory()) continue;
      
      // If this is a symlink, resolve to its target
      let resolvedDir = platformDir;
      if (fs.lstatSync(platformDir).isSymbolicLink()) {
        resolvedDir = fs.realpathSync(platformDir);
      }
      
      console.log(`Processing ${platform} files...`);
      
      // Process files in the platform directory recursively
      await this.processDirectory(resolvedDir, platform, features, fileTypes);
    }
    
    console.log(`Collected ${features.size} files across ${new Set(fileTypes.values()).size} platforms`);
    return { features, fileTypes };
  }
  
  /**
   * Process a directory recursively, extracting features from all files
   * @param dirPath Directory path to process
   * @param platform Platform identifier for classification
   * @param features Map to store extracted features
   * @param fileTypes Map to store file type labels
   */
  private async processDirectory(
    dirPath: string, 
    platform: string, 
    features: Map<string, [string, number][]>, 
    fileTypes: Map<string, string>
  ): Promise<void> {
    // Process each file/directory in the current directory
    for (const entry of fs.readdirSync(dirPath)) {
      const entryPath = path.join(dirPath, entry);
      const entryStats = fs.statSync(entryPath);
      
      // If this is a symlink, resolve it
      let resolvedEntryPath = entryPath;
      try {
        if (fs.lstatSync(entryPath).isSymbolicLink()) {
          try {
            resolvedEntryPath = fs.realpathSync(entryPath);
            const resolvedStats = fs.statSync(resolvedEntryPath);
            
            if (resolvedStats.isDirectory()) {
              // Recursively process the resolved directory
              await this.processDirectory(resolvedEntryPath, platform, features, fileTypes);
              continue;
            }
          } catch (error: any) {
            // TODO Handle case where symlink resolution fails (e.g., with files containing backslashes)
            console.log(`  Skipping symlink resolution for ${path.basename(entryPath)}: ${error.message || error}`);
          }
        }
      } catch (error: any) {
        // Handle case where lstat fails (rare)
        console.log(`  Error checking if symlink: ${path.basename(entryPath)}: ${error.message || error}`);
      }
      
      if (entryStats.isDirectory()) {
        // Recursively process subdirectory
        await this.processDirectory(entryPath, platform, features, fileTypes);
      } else if (entryStats.isFile()) {
        // Process file
        try {
          // Use the resolved path if it's a symlink, otherwise use the original path
          const pathToProcess = resolvedEntryPath || entryPath;
          
          // Verify the path is a readable regular file, not a special file or device
          try {
            fs.accessSync(pathToProcess, fs.constants.R_OK);
          } catch (e) {
            console.log(`  Skipping unreadable file: ${path.basename(pathToProcess)}`);
            continue;
          }
          
          try {
            // Create a file ID using just the basename to avoid path separator issues
            const fileName = path.basename(entryPath);
            // Create a safe file ID without problematic characters
            const fileId = `${platform}_${fileName}`;
            
            // Extract features
            const fileFeatures = this.pipeline.extractFromFile(pathToProcess);
            features.set(fileId, fileFeatures);
            fileTypes.set(fileId, platform);
            
            console.log(`  Processed ${fileName}`);
          } catch (error: any) {
            console.error(`  Error extracting features from ${path.basename(entryPath)}: ${error.message || error}`);
          }
        } catch (error: any) {
          console.error(`  Error processing ${path.basename(entryPath)}: ${error.message || error}`);
        }
      }
    }
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