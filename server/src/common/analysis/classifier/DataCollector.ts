import fs from 'fs';
import path from 'path';
import {defaultPipeline, FeaturePipeline} from '../FeatureExtractionPipeline.js';
import {TrainingData} from './BinaryClassifierEnsemble.js';

interface PathResolution {
  resolvedPath: string | null;
  stats: fs.Stats | null;
}

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
    const entries = this.readDirectoryEntries(dirPath);
    if (!entries) return;

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry);

      // Handle symlinks and get the correct path to use
      const { resolvedPath, stats } = this.resolvePathAndStats(entryPath);
      if (!resolvedPath || !stats) continue;

      if (stats.isDirectory()) {
        // Recursively process subdirectory
        await this.processDirectory(resolvedPath, platform, features, fileTypes);
      } else if (stats.isFile()) {
        // Process the file if readable
        this.processFileEntry(resolvedPath, entryPath, platform, features, fileTypes);
      }
    }
  }
  
  /**
   * Safely read directory entries
   * @param dirPath Directory to read
   * @returns Array of entry names or null if error
   */
  private readDirectoryEntries(dirPath: string): string[] | null {
    try {
      return fs.readdirSync(dirPath);
    } catch (error: any) {
      console.error(`  Error reading directory ${dirPath}: ${error.message || error}`);
      return null;
    }
  }
  
  /**
   * Resolve a path that might be a symlink and get its stats
   * @param entryPath Path to resolve
   * @returns Object with resolved path and stats, or null values if error
   */
  private resolvePathAndStats(entryPath: string): PathResolution {
    // First check if it's a symlink
    try {
      if (fs.lstatSync(entryPath).isSymbolicLink()) {
        return this.resolveSymlink(entryPath);
      } else {
        // Handle regular files/directories
        try {
          const stats = fs.statSync(entryPath);
          return { resolvedPath: entryPath, stats };
        } catch (error: any) {
          console.error(`  Error accessing ${path.basename(entryPath)}: ${error.message || error}`);
          return { resolvedPath: null, stats: null };
        }
      }
    } catch (error: any) {
      console.error(`  Error checking if symlink for ${path.basename(entryPath)}: ${error.message || error}`);
      return { resolvedPath: null, stats: null };
    }
  }
  
  /**
   * Handle a symlink by resolving it and getting the target's stats
   * @param symlinkPath Path to the symlink
   * @returns Object with resolved path and stats, or null values if error
   */
  private resolveSymlink(symlinkPath: string): PathResolution {
    // Try to resolve the symlink
    let resolvedPath: string;
    try {
      resolvedPath = fs.realpathSync(symlinkPath);
    } catch (error: any) {
      console.log(`  Skipping broken symlink: ${path.basename(symlinkPath)}`);
      return { resolvedPath: null, stats: null };
    }
    
    // Get stats for the resolved path
    try {
      const stats = fs.statSync(resolvedPath);
      return { resolvedPath, stats };
    } catch (error: any) {
      console.error(`  Error accessing symlink target ${path.basename(resolvedPath)}: ${error.message || error}`);
      return { resolvedPath: null, stats: null };
    }
  }
  
  /**
   * Process a file entry by extracting features
   * @param realPath The actual file path to read (resolved symlink if applicable)
   * @param originalPath The original entry path (for naming/logging)
   * @param platform Platform identifier
   * @param features Features map to update
   * @param fileTypes File types map to update
   */
  private processFileEntry(
    realPath: string,
    originalPath: string,
    platform: string,
    features: Map<string, [string, number][]>,
    fileTypes: Map<string, string>
  ): void {
    // Check if file is readable
    if (!this.isFileReadable(realPath)) return;
    
    try {
      // Create a file ID using just the basename to avoid path separator issues
      const fileName = path.basename(originalPath);
      const fileId = `${platform}_${fileName}`;
      
      // Extract features
      const fileFeatures = this.pipeline.extractFromFile(realPath);
      features.set(fileId, fileFeatures);
      fileTypes.set(fileId, platform);
      
      console.log(`  Processed ${fileName}`);
    } catch (error: any) {
      console.error(`  Error extracting features from ${path.basename(originalPath)}: ${error.message || error}`);
    }
  }
  
  /**
   * Check if a file is readable
   * @param filePath Path to check
   * @returns true if file is readable
   */
  private isFileReadable(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch (e) {
      console.log(`  Skipping unreadable file: ${path.basename(filePath)}`);
      return false;
    }
  }

  /**
   * Split data into training and testing sets
   * @param data Full dataset
   * @param testRatio Ratio of data to use for testing (0-1)
   * @returns Split data sets
   */
  splitTrainingTestData(data: TrainingData, testRatio: number = 0.2): { 
    training: TrainingData; 
    testing: TrainingData; 
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