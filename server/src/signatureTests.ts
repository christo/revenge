import fs from "fs";
import path from "path";
import {FileLike} from "./common/FileLike.js";
import {EnhancedSignatureExtractor} from "./common/analysis/EnhancedSignatureExtractor.js";

const PRELOAD_PATH = path.resolve('./data/preload');

/**
 * Main function to analyze signatures in a binary file
 */
export async function signatureTest(filePath: string) {

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    console.log(`Analyzing signatures in: ${path.basename(filePath)}`);

    // Create FileLike object from the file
    const fileData = new FileLike(
        path.basename(filePath),
        Array.from(fs.readFileSync(filePath))
    );

    // Create the enhanced signature extractor
    const signatureExtractor = new EnhancedSignatureExtractor();

    // Extract signatures
    const signatureFeatures = signatureExtractor.extract(fileData);

    // Display the results
    console.log('\nSignature Analysis Results:');

    // Count matching signatures by platform
    const platformMatches = new Map<string, number>();
    const allMatches = [];
    let totalMatches = 0;

    // Process all signature features
    for (const [featureName, value] of signatureFeatures) {
      // Skip non-match features
      if (!featureName.startsWith('signature_') ||
          featureName === 'signature_match_count' ||
          featureName.includes('platform_') ||
          featureName.includes('dominant_platform') ||
          value === 0) {
        continue;
      }

      // Extract platform from feature name if possible
      const nameParts = featureName.replace('signature_', '').split('_');
      if (nameParts.length > 1) {
        const platform = nameParts[0];
        const currentCount = platformMatches.get(platform) || 0;
        platformMatches.set(platform, currentCount + 1);
      }

      // Store match info
      allMatches.push({
        name: featureName.replace('signature_', ''),
        confidence: value
      });

      totalMatches++;
    }

    // Display match count
    console.log(`Total signature matches: ${totalMatches}`);

    // Display platform summary
    console.log('\nPlatform Signature Matches:');
    for (const [platform, count] of platformMatches.entries()) {
      console.log(`${platform.padEnd(10)} ${count} matches`);
    }

    // Display detailed signature matches
    console.log('\nMatching Signatures:');

    // Sort by confidence
    allMatches.sort((a, b) => b.confidence - a.confidence);

    for (const match of allMatches) {
      console.log(`${match.name.padEnd(30)} ${(match.confidence * 100).toFixed(1)}% confidence`);
    }

    // Display structural features
    console.log('\nStructural Features:');
    for (const [featureName, value] of signatureFeatures) {
      if (featureName.includes('valid_basic_structure') ||
          featureName.includes('basic_line_count') ||
          featureName.includes('memory') ||
          featureName.includes('dominant_platform')) {
        console.log(`${featureName.replace('signature_', '').padEnd(30)} ${value}`);
      }
    }

  } catch (error) {
    console.error('Error analyzing file:', error);
    process.exit(1);
  }
}

/**
 * Main function to analyze signatures in multiple files
 */
export async function batchSignatureTest() {
  try {
    console.log('Enhanced Signature Extractor Batch Test');
    console.log('=====================================');

    // Get platform directories
    const platforms = fs.readdirSync(PRELOAD_PATH);

    // Store results
    const results = {
      total: 0,
      correct: 0,
      incorrect: 0,
      byPlatform: new Map<string, { total: number; correct: number }>()
    };

    // Create the enhanced signature extractor
    const signatureExtractor = new EnhancedSignatureExtractor();

    // Process each platform
    for (const platform of platforms) {
      // Skip non-directories
      const platformPath = path.join(PRELOAD_PATH, platform);
      if (!fs.statSync(platformPath).isDirectory()) {
        continue;
      }

      // Initialize platform stats
      results.byPlatform.set(platform, {total: 0, correct: 0});

      console.log(`\nProcessing ${platform} files...`);

      // Get files in this platform directory
      const files = fs.readdirSync(platformPath);

      // Process each file
      for (const fileName of files) {
        const filePath = path.join(platformPath, fileName);
        if (!fs.statSync(filePath).isFile()) {
          continue;
        }

        // Create FileLike object
        const fileData = new FileLike(
            fileName,
            Array.from(fs.readFileSync(filePath))
        );

        // Extract signatures
        const signatureFeatures = signatureExtractor.extract(fileData);

        // Look for platform-specific features
        const platformFeatures = signatureFeatures.filter(([name]) =>
            name.startsWith('signature_platform_'));

        // First check if we have platform_features
        let dominantPlatform = '';

        if (platformFeatures.length > 0) {
          // Use the platform features directly
          let highestCount = 0;

          for (const [name, value] of platformFeatures) {
            const platform = name.replace('signature_platform_', '');
            if (value > highestCount) {
              dominantPlatform = platform;
              highestCount = value;
            }
          }
        } else {
          // Fall back to checking all signature matches
          const platformMatches = new Map<string, number>();

          // Process all signature features
          for (const [featureName, value] of signatureFeatures) {
            // Skip non-match features
            if (!featureName.startsWith('signature_') ||
                featureName === 'signature_match_count' ||
                featureName.includes('platform_') ||
                featureName.includes('dominant_platform') ||
                value === 0) {
              continue;
            }

            // Extract platform from feature name if possible
            const nameParts = featureName.replace('signature_', '').split('_');
            if (nameParts.length > 1) {
              const sigPlatform = nameParts[0];
              // Only consider actual platforms
              if (sigPlatform === 'c64' || sigPlatform === 'vic20' ||
                  sigPlatform === 'zx' || sigPlatform === 'atari8bit' ||
                  sigPlatform === 'msx' || sigPlatform === 'nes' ||
                  sigPlatform === 'apple2' || sigPlatform === 'bbc') {
                const currentCount = platformMatches.get(sigPlatform) || 0;
                platformMatches.set(sigPlatform, currentCount + value);
              }
            }
          }

          // Determine dominant platform
          let highestCount = 0;

          for (const [plt, count] of platformMatches.entries()) {
            if (count > highestCount) {
              dominantPlatform = plt;
              highestCount = count;
            }
          }
        }

        // Update statistics
        results.total++;
        const platformStats = results.byPlatform.get(platform)!;
        platformStats.total++;

        // Check if prediction is correct
        const isCorrect = dominantPlatform === platform;
        if (isCorrect) {
          results.correct++;
          platformStats.correct++;
        } else {
          results.incorrect++;
          console.log(`  Misclassified: ${fileName} as ${dominantPlatform || 'unknown'}`);

          // Print detailed match information for misclassified files
          const platformScores = signatureFeatures
              .filter(([name]) => name.startsWith('signature_platform_'))
              .map(([name, value]) => `${name.replace('signature_platform_', '')}=${value.toFixed(1)}`);

          console.log(`    Platform scores: ${platformScores.join(', ') || 'none'}`);

          // Show all matching signature features
          const matchingSignatures = signatureFeatures
              .filter(([name, value]) =>
                  name.startsWith('signature_') &&
                  !name.includes('platform_') &&
                  !name.includes('dominant_platform') &&
                  !name.includes('valid_basic_structure') &&
                  !name.includes('basic_line_count') &&
                  !name.includes('has_') &&
                  name !== 'signature_match_count' &&
                  value > 0
              )
              .map(([name, value]) => `${name.replace('signature_', '')}=${value.toFixed(1)}`);

          console.log(`    Signatures: ${matchingSignatures.join(', ') || 'none'}`);

          // Find the structural features
          const structuralFeatures = signatureFeatures.filter(([name]) =>
              name.includes('valid_basic_structure') ||
              name.includes('basic_line_count') ||
              name.includes('has_'));

          console.log(`    Features: ${structuralFeatures
              .map(([name, val]) => `${name.replace('signature_', '')}=${val.toFixed(1)}`)
              .join(', ')}`);
        }
      }
    }

    // Display results summary
    console.log('\nResults Summary:');
    console.log(`Total files: ${results.total}`);
    console.log(`Correctly classified: ${results.correct} (${(results.correct / results.total * 100).toFixed(2)}%)`);
    console.log(`Incorrectly classified: ${results.incorrect} (${(results.incorrect / results.total * 100).toFixed(2)}%)`);

    console.log('\nResults by Platform:');
    for (const [platform, stats] of results.byPlatform.entries()) {
      const accuracy = stats.correct / stats.total * 100;
      console.log(`${platform.padEnd(10)} ${stats.correct}/${stats.total} (${accuracy.toFixed(2)}%)`);
    }

  } catch (error) {
    console.error('Error in batch analysis:', error);
    process.exit(1);
  }
}