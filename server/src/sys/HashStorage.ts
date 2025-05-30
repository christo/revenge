/**
 * File I/O operations for HashCalc.
 * This module is server-side only and is responsible for loading and saving hash data.
 */
import fs, {existsSync, mkdirSync, writeFileSync} from 'fs';
import path from "path";
import 'dotenv/config';
import {HashCalc} from "../common/analysis/HashCalc.js";
import {HashType} from "../common/analysis/HashType.js";

const SHA1_FILE = `sha1.txt`;
const MD5_FILE = `md5.txt`;
const CRC32_FILE = `crc32.txt`;

/**
 * Metadata about a list of hashes for a single algo.
 */
class HashSummary {
  static NONE = new HashSummary(0);
  count: number;
  private headers: [string, string][]

  constructor(count: number, headers: [string, string][] = []) {
    this.count = count;
    this.headers = headers;
  }

  header(key: string): string | undefined {
    return this.headers.find(h => h[0] === key)?.[1];
  }
}

/**
 * Persists and loads content hash data to and from disk.
 */
class HashStorage {
  private static VERSION = 2;
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.join(baseDir, "analysis", "hash");
  }

  /**
   * Saves hash data to disk.
   * @param hashCalc contains the calculated hash values with file references
   */
  save(hashCalc: HashCalc) {
    if (!existsSync(this.baseDir)) {
      console.log(`creating base dir for HashStorage ${this.baseDir}`);
      mkdirSync(this.baseDir, {recursive: true});
    }
    console.log(`Saving HashStorage in base dir: ${this.baseDir}`);

    this.writeHashes("sha1", SHA1_FILE, hashCalc.getHashesSha1());
    this.writeHashes("md5", MD5_FILE, hashCalc.getHashesMd5());
    this.writeHashes("crc32", CRC32_FILE, hashCalc.getHashesCrc32());
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
    // TODO consider returning the summaries so they could be regenerated if out of date
    const sha1Result: HashSummary = this.loadHashes(SHA1_FILE, (hash, name) => hashCalc.addSha1Hash(name, hash));
    console.log(`loaded ${sha1Result.count} SHA1 hashes`);

    const md5Result: HashSummary = this.loadHashes(MD5_FILE, (hash, name) => hashCalc.addMd5Hash(name, hash));
    console.log(`loaded ${md5Result.count} MD5 hashes`);

    const crc32Result: HashSummary = this.loadHashes(CRC32_FILE, (hash, name) => hashCalc.addCrc32Hash(name, hash));
    console.log(`loaded ${crc32Result.count} CRC32 hashes`);
  }

  private writeHashes(algo: HashType, filename: string, hashes: [string, string][]) {
    const filePath = path.join(this.baseDir, filename);
    const headers: string[] = [
      `warning:do not edit`,
      `generated by:HashStorage`,
      `algo:${algo}`,
      `timestamp:${new Date().toISOString()}`,
      `count:${hashes.length}`,
      `version:${HashStorage.VERSION}`
    ];
    const header = headers.map(h => `# ${h}`).join("\n");
    const hashLines = hashes.map(v => `${v[1]} ${v[0]}`).join("\n");
    const data = `${header}\n${hashLines}\n`;
    writeFileSync(filePath, data, 'utf8');
  }

  private loadHashes(filename: string, addFn: (hash: string, name: string) => void): HashSummary {
    const filePath = path.join(this.baseDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`file ${filePath} does not exist, cannot load hashes`);
      return HashSummary.NONE;
    }

    const file = fs.readFileSync(filePath, 'utf8');
    let hashesLoaded = 0;
    const headers: [string, string][] = [];
    file.split("\\n").forEach((line) => {
      // read headers
      const hre = line.match(/#(\w+):(.*)/);
      if (hre) {
        const field = hre[1];
        const value = hre[2];
        headers.push([field, value]);
      }
      // skip comment lines or any line not matching expected format
      const re = line.match(/^([^# ])+\s(.*)$/);
      if (re) {
        hashesLoaded++;
        const hash = re[1];
        const name = re[2];
        addFn(hash, name);
      }
    });
    return new HashSummary(hashesLoaded, headers);
  }
}

export {HashStorage};