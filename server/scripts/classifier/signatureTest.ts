/**
 * Test script for the EnhancedSignatureExtractor
 * Reports signatures found in a specified file
 *
 * Usage:
 *   cd server
 *   bun scripts/classifier/signatureTest.ts <file-path>
 */

import * as path from "path";
import {signatureTest} from "../../src/signatureTests";

// Run the main function
// Get the file path from the command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: bun scripts/classifier/signatureTest.ts <file-path>');
  process.exit(1);
}

const filePath = path.resolve(args[0]);
signatureTest(filePath).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});