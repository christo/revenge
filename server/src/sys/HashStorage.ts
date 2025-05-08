/**
 * File I/O operations for HashCalc.
 * This module is server-side only and is responsible for loading and saving hash data.
 */
import fs, {existsSync, mkdirSync, writeFileSync} from 'fs';
import path from "path";
import 'dotenv/config';
import {HashCalc} from "../common/analysis/HashCalc.js";

const SHA1_FILE = `sha1.txt`;
const MD5_FILE = `md5.txt`;
const CRC32_FILE = `crc32.txt`;

/**
 * Persists and loads HashCalc data from disk.
 * This is separated from HashCalc to keep the core calculation logic browser-compatible.
 */
class HashStorage {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.join(baseDir, "analysis", "hash");
  }

  /**
   * Saves hash data to disk.
   */
  save(hashCalc: HashCalc) {
    if (!existsSync(this.baseDir)) {
      console.log(`creating base dir for HashStorage ${this.baseDir}`);
      mkdirSync(this.baseDir, {recursive: true});
    }
    console.log(`HashStorage base dir: ${this.baseDir}`);

    this.writeHashes("SHA1", SHA1_FILE, hashCalc.getHashesSha1());
    this.writeHashes("MD5", MD5_FILE, hashCalc.getHashesMd5());
    this.writeHashes("CRC32", CRC32_FILE, hashCalc.getHashesCrc32());
  }

  /**
   * Whether all the hash files exist.
   */
  exists() {
    return fs.existsSync(path.join(this.baseDir, SHA1_FILE))
        && fs.existsSync(path.join(this.baseDir, MD5_FILE))
        && fs.existsSync(path.join(this.baseDir, CRC32_FILE));
  }

  /**
   * Loads hash data from disk into the provided HashCalc instance.
   */
  load(hashCalc: HashCalc) {
    let hashesLoaded = this.loadHash(SHA1_FILE, (hash, name) => hashCalc.addSha1Hash(name, hash));
    console.log(`loaded ${hashesLoaded} SHA1 hashes`);
    
    hashesLoaded = this.loadHash(MD5_FILE, (hash, name) => hashCalc.addMd5Hash(name, hash));
    console.log(`loaded ${hashesLoaded} MD5 hashes`);
    
    hashesLoaded = this.loadHash(CRC32_FILE, (hash, name) => hashCalc.addCrc32Hash(name, hash));
    console.log(`loaded ${hashesLoaded} CRC32 hashes`);
  }

  private writeHashes(hashName: string, filename: string, hashes: [string, string][]) {
    const lastWritten = `written at ${new Date().toISOString()}`
    let filePath = path.join(this.baseDir, filename);
    const header = `# ${hashName} hashes ${lastWritten}`;
    const hashLines = hashes.map(v => `${v[1]} ${v[0]}`).join("\\n");
    const data = `${header}\\n${hashLines}\\n`;
    writeFileSync(filePath, data, 'utf8');
  }

  private loadHash(filename: string, addFn: (hash: string, name: string) => void) {
    const filePath = path.join(this.baseDir, filename);
    if (!fs.existsSync(filePath)) {
      return 0;
    }
    
    const file = fs.readFileSync(filePath, 'utf8');
    let hashesLoaded = 0;
    file.split("\\n").forEach((line) => {
      // skip comment lines or any line not matching expected format
      const re = line.match(/^([^# ])+\\s(.*)$/);
      if (re) {
        hashesLoaded++;
        const hash = re[1];
        const name = re[2];
        addFn(hash, name);
      }
    });
    return hashesLoaded;
  }
}

export {HashStorage};