#!/usr/bin/env bun

import {readdir, stat} from 'node:fs/promises';
import {join, resolve} from 'node:path';

const MB1 = 1024 * 1024;

const excludeExtensions = [
  "tap",
  "zip",
  "html",
  "js",
  "pdf",
  "jpg",
  "sqlite",
  "TAP",
  "txt",
  "md",
  "wav",
  "log",
  "ZIP",
  "webm",
  "brd",
  "pptx",
  "img",
  "bin",
  "png",
  "doc",
  "readme",
  "com",
  "xlsm",
  "xlsx",
  "Makefile",
  "tar",
  "gif",
  "yml",
  "xml",
  "lha",
  "hqx",
  "tgz",
  "gz",
  "bat",
  "sh",
  "c",
  "h",
  "asm",
  "s",
  "i",
  "o",
  "pl",
  "inc",
  "a65",
  "s65",
  "lst",
  "mk",
  "svg",
  "css",
  "rb",
  "mid",
];

type FileInfo = {
  name: string;
  path: string;
  size: number;
}

function formatBytesInMegs(n: number): string {
  return (n / (MB1)).toFixed(3);
}

const okExt = (fi: FileInfo) => {
  return excludeExtensions.find((e: string) => {
    return fi.name === e || fi.name.toLowerCase().endsWith(`.${e.toLowerCase()}`);
  }) === undefined;
};

const bySize = (a: FileInfo, b: FileInfo) => a.size - b.size

async function findLargeFiles(directory: string) {
  try {
    const rootDir = resolve(directory);
    const files: FileInfo[] = [];
    await scanDirectory(rootDir, files);
    console.log("");
    console.log(`FILES:`);
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

async function scanDirectory(dirPath: string, files: Array<FileInfo>): Promise<void> {
  try {
    const entries = await readdir(dirPath, {withFileTypes: true});

    for (const entry of entries) {
      if (!entry.name.startsWith(".")) {
        const fullPath = join(dirPath, entry.name);
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await scanDirectory(fullPath, files);
        } else if (entry.isFile()) {
          // Check file size
          const stats = await stat(fullPath);
          files.push({
            name: entry.name,
            size: stats.size,
            path: fullPath
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
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