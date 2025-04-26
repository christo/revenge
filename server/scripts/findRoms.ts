#!/usr/bin/env bun

import {resolve} from "node:path";
import {bySize, FileInfo, formatBytesInMegs, MB1, okExt, scanDirectory} from "../src/./sys/finder";


async function findLargeFiles(directory: string) {
  try {
    const rootDir1 = resolve(directory);
    const files: FileInfo[] = [];
    await scanDirectory(rootDir1, files);
    const fileInfos = [];
    files.filter((fi: FileInfo) => fi.size > MB1)
        .sort(bySize)
        .forEach(fileInfo => {
          console.log(`${formatBytesInMegs(fileInfo.size)} Mb ${fileInfo.path}`);
        });
    console.log("");
    console.log(`${files.length} files`);
    console.log("");
    console.log(`EXTENSIONS:`);
    const extensions = new Set<string>();
    files.filter(okExt).map(fi => fi.path).forEach(p => {
      const extMatch = p.match(/.*\.(\S+)$/)
      if (extMatch) {
        extensions.add(extMatch[1]);
      }
    });
    extensions.forEach(extension => {
      console.log(`    ${extension}`);
    });
    console.log(`${extensions.size} extensions`);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Get the root directory from command line arguments
const rootDir = process.argv[2];

if (!rootDir) {
  console.error('Error: Please provide a root directory path.');
  console.error('Usage: findRoms.ts <root-directory>');
  process.exit(1);
}

findLargeFiles(rootDir).then(() => console.log("done"));