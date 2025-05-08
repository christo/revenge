/**
 * Test script for batch analysis of files with the EnhancedSignatureExtractor
 *
 * Usage:
 *   cd server
 *   bun scripts/classifier/batchSignatureTest.ts
 */

import {batchSignatureTest} from "../../src/signatureTests";

// Run the main function
batchSignatureTest().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});