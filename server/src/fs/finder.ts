import * as fs from "fs";
import {readdir, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {FileLike} from "../common/FileLike";

const MB1 = 1024 * 1024;

const DOC_EXTS = [
  "pdf",
  "xlsm",
  "xlsx",
  "pptx",
  "doc",
];

const ARCHIVE_EXTS = [
  "zip",
  "ZIP",
  "tar",
  "lha",
  "hqx",
  "tgz",
  "gz",
];

const SRC_EXTS = [
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
  "html",
  "htm",  // ok boomer
  "js",
  "Makefile",
  "yml",
  "xml",
  "vkm", // vice keyboard map
  "cpp",
  "sln", // visual studio project file
  "vcxproj",
  "vcxproj.filters",
  "vcxproj.user"
];

const TEXT_EXTS = [
  "txt",
  "md",
  "readme",
  "log",
  "nfo",
  ...SRC_EXTS
];

const MEDIA_EXTS = [
  "jpg",
  "wav",
  "webm",
  "png",
  "gif",
  "mid",
  "ico"
];

const NON_ROM_EXTS = [
  "tap",
  "sqlite",
  "TAP",
  "brd",
  "img",
  "bin",
  "com",
  "exe",
  "diz",
  ...DOC_EXTS,
  ...MEDIA_EXTS,
  ...TEXT_EXTS,
  ...ARCHIVE_EXTS,
];

type FileInfo = {
  name: string;
  path: string;
  size: number;
}

function formatBytesInMegs(n: number): string {
  return (n / (MB1)).toFixed(3);
}

/**
 * Using common file extensions defined above, return false only if the file extension is an exact match or
 * occurs after the final dot of the file name.
 * @param fi
 */
const okExt = (fi: FileInfo) => {
  return NON_ROM_EXTS.find((e: string) => {
    return fi.name === e || fi.name.toLowerCase().endsWith(`.${e.toLowerCase()}`);
  }) === undefined;
};

function fileInfoToFileLike(fileInfo: FileInfo): FileLike {
  const buffer = fs.readFileSync(fileInfo.path);
  const data = Uint8Array.from(buffer);
  return new FileLike(fileInfo.path, data);
}

/**
 * Comparator based on ascending size.
 * @param a
 * @param b
 */
const bySize = (a: FileInfo, b: FileInfo) => a.size - b.size

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

export {scanDirectory, type FileInfo, bySize, formatBytesInMegs, okExt, MB1, fileInfoToFileLike};



