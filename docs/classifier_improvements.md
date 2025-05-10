# Binary Classifier Improvement Recommendations

The current classification results are disappointing and require significant improvements to achieve nominal classifier performance. Of particular note is poor VIC20 recall rate.

## Current Issues

1. **Severe Class Imbalance**: 
   - 85.10% C64 samples vs. 14.90% VIC20 samples
   - The classifier has learned to predict C64 for almost everything (99.71% recall)
   - Very poor VIC20 recall (21.11%) despite good precision (92.68%)

2. **Model Decision Bias**:
   - The simple centroid-based classifier approach in `BinaryClassifierEnsemble.ts` is susceptible to class imbalance
   - The Euclidean distance metric treats all features with equal weight

3. **Feature Engineering Gaps**:
   - Current features may not sufficiently capture the distinguishing characteristics between VIC20 and C64 files
   - Load address information is present in `EnhancedSignatureExtractor` but may not be weighted heavily enough

## Proposed Solutions

### 1. Address Class Imbalance

```typescript
/**
 * Modify the trainClassifier method in BinaryClassifierEnsemble.ts to add class weighting
 */
private async trainClassifier(className: string, preparedData: {
  features: number[][],
  labels: Map<string, number[]>
}): Promise<void> {
  // Simple nearest centroid classifier with class weighting
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
  
  // Calculate weight based on class distribution
  // Apply higher weight to minority class (vic20)
  const classWeight = className === 'vic20' ? 
      positiveIndices.length > 0 ? negativeIndices.length / positiveIndices.length : 1 : 1;
  
  // Calculate centroids with weighting
  const positiveCentroid = this.calculateCentroid(preparedData.features, positiveIndices);
  const negativeCentroid = this.calculateCentroid(preparedData.features, negativeIndices);
  
  // Store model with class weight
  this.models.set(className, {
    positiveCentroid,
    negativeCentroid,
    className,
    classWeight // Add weight to model
  });
}

/**
 * Modify predict method to use class weights
 */
const score = isNaN(score) ? 0.5 : score * (model.classWeight || 1.0);
```

### 2. Create a Specialized LoadAddressExtractor

Implement a new extractor that leverages the machine-specific load address information already defined in the codebase:

```typescript
import {FeatureExtractor} from "./FeatureExtractor.js";
import {FileLike} from "../FileLike.js";

/**
 * Specialized extractor that analyzes file load addresses
 * Uses machine-specific knowledge from cbm/vic20.ts and cbm/c64.ts
 */
export class LoadAddressExtractor implements FeatureExtractor {
  // Use the load addresses already defined in the codebase
  private readonly C64_ADDRESSES = [0x0801, 0x080D, 0x8000, 0xA000, 0xC000, 0x2000, 0x4000];
  private readonly VIC20_ADDRESSES = [0x1001, 0x0401, 0x1201, 0x1101, 0x1301, 0xA000, 0x2000];
  
  extract(file: FileLike): [string, number][] {
    if (file.size < 2) {
      return [["load_addr_match", 0]];
    }
    
    // Extract load address (first two bytes in little-endian format)
    const loadAddress = file.bytes[0] | (file.bytes[1] << 8);
    
    // Check exact matches (high confidence)
    const isExactC64Match = this.C64_ADDRESSES.includes(loadAddress) ? 1 : 0;
    const isExactVic20Match = this.VIC20_ADDRESSES.includes(loadAddress) ? 1 : 0;
    
    // Calculate similarity to known addresses
    const c64Distance = Math.min(...this.C64_ADDRESSES.map(addr => 
      Math.abs(addr - loadAddress)));
    const vic20Distance = Math.min(...this.VIC20_ADDRESSES.map(addr => 
      Math.abs(addr - loadAddress)));
    
    // Normalized similarity scores (closer to 1 = more similar)
    const maxDistance = 0xFFFF; // Maximum possible distance in 16-bit address space
    const c64Similarity = 1 - (c64Distance / maxDistance);
    const vic20Similarity = 1 - (vic20Distance / maxDistance);
    
    return [
      ["load_addr_value", loadAddress / 0x10000], // Normalized load address
      ["load_addr_c64_exact", isExactC64Match],
      ["load_addr_vic20_exact", isExactVic20Match],
      ["load_addr_c64_similarity", c64Similarity],
      ["load_addr_vic20_similarity", vic20Similarity],
      // Platform indicator (-1 to 1 range, negative means likely VIC20)
      ["load_addr_platform_indicator", c64Similarity - vic20Similarity]
    ];
  }
  
  descriptor(): string {
    return `LoadAddressExtractor
Special features based on known platform load addresses
C64 addresses: ${this.C64_ADDRESSES.length}
VIC20 addresses: ${this.VIC20_ADDRESSES.length}`;
  }
}
```

### 3. Create a Custom Balanced Pipeline

```typescript
/**
 * Create a balanced pipeline specifically for C64/VIC20 classification
 * Add to FeatureExtractionPipeline.ts
 */
function balancedVic20C64Pipeline(): FeaturePipeline {
  const pipeline = new FeaturePipeline();
  
  // Keep core extractors
  pipeline.add(new EntropyExtractor());
  pipeline.add(new LengthExtractor());
  
  // Add the specialized load address extractor
  pipeline.add(new LoadAddressExtractor());
  
  // Add enhanced signature extractor with additional weight
  const enhancedSig = new EnhancedSignatureExtractor();
  // Optionally add more VIC20-specific signatures here
  pipeline.add(enhancedSig);
  
  // Add optimized n-gram extractors
  pipeline.add(new NgramExtractor(1, 10, NgramSelectionStrategy.ENTROPY));
  pipeline.add(new NgramExtractor(2, 10, NgramSelectionStrategy.ENTROPY));
  
  return pipeline;
}
```

### 4. Implement Data Augmentation or Resampling

```typescript
/**
 * Add to DataCollector.ts
 */
public balanceDataset(data: TrainingData, targetRatio: number = 0.5): TrainingData {
  // Identify majority and minority classes
  const classCounts = new Map<string, number>();
  for (const className of data.fileTypes.values()) {
    classCounts.set(className, (classCounts.get(className) || 0) + 1);
  }
  
  // Find minority class
  let minorityClass = '';
  let minorityCount = Infinity;
  for (const [className, count] of classCounts.entries()) {
    if (count < minorityCount) {
      minorityCount = count;
      minorityClass = className;
    }
  }
  
  // Get all samples of minority class
  const minoritySamples = Array.from(data.fileTypes.entries())
    .filter(([_, className]) => className === minorityClass)
    .map(([id, _]) => id);
  
  // Create synthetic samples through random duplication
  const balancedData: TrainingData = {
    features: new Map(data.features),
    fileTypes: new Map(data.fileTypes)
  };
  
  const majorityCount = Math.max(...Array.from(classCounts.values()));
  const targetMinorityCount = Math.floor(majorityCount * targetRatio);
  const samplesToAdd = targetMinorityCount - minorityCount;
  
  // Add duplicated samples with small random variations
  for (let i = 0; i < samplesToAdd; i++) {
    // Pick a random minority sample
    const sampleId = minoritySamples[Math.floor(Math.random() * minoritySamples.length)];
    const newId = `${sampleId}_synthetic_${i}`;
    
    // Add slightly modified version of the sample
    const originalFeatures = data.features.get(sampleId)!;
    const modifiedFeatures = this.addNoiseToFeatures(originalFeatures);
    
    balancedData.features.set(newId, modifiedFeatures);
    balancedData.fileTypes.set(newId, minorityClass);
  }
  
  return balancedData;
}

private addNoiseToFeatures(features: [string, number][]): [string, number][] {
  return features.map(([name, value]) => {
    // Add small random noise to numeric features
    const noise = Math.random() * 0.1 - 0.05; // -5% to +5%
    return [name, Math.max(0, value + (value * noise))];
  });
}
```

### 5. Update Training Script

Add a command line option to use the new balanced pipeline and data resampling:

```typescript
// In trainClassifier.ts

// Add new command line option
const pipelineType = process.argv[2] || 'full';
const useBalancing = process.argv[3] === 'balanced';

// After building complete data
if (useBalancing) {
  console.log('\nBalancing dataset to improve minority class representation...');
  completeData = collector.balanceDataset(completeData, 0.7);
  console.log(`Dataset after balancing: ${completeData.features.size} files`);
}
```

## Implementation Strategy

1. First implement the `LoadAddressExtractor` since it leverages existing code and should immediately improve the VIC20 detection rate.

2. Next, add class weighting to the BinaryClassifierEnsemble to address the class imbalance issue.

3. Create the balanced pipeline specifically optimized for VIC20/C64 distinction.

4. Add data augmentation/resampling as a more advanced technique if needed.

5. Experiment with different parameter settings (weight factors, pipeline combinations) to find the optimal configuration.

## Expected Results

- Improved VIC20 recall without significantly sacrificing C64 precision
- Better F1 score for the VIC20 class
- More balanced overall performance between both classes

This approach uses the existing platform-specific knowledge in the codebase rather than creating entirely new components, making maintenance simpler.