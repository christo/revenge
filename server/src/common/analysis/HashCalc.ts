import fs, {existsSync, mkdirSync, writeFileSync} from 'fs';
import {crc32, md5, sha1} from "hash-wasm";
import path from "path";
import {FileLike} from "../FileLike";
import 'dotenv/config';

const SHA1_FILE = `sha1.txt`;
const MD5_FILE = `md5.txt`;
const CRC32_FILE = `crc32.txt`;

class HashCalc {
  private hashesSha1: Array<[string, string]> = [];
  private hashesMd5: Array<[string, string]> = [];
  private hashesCrc32: Array<[string, string]> = [];
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.join(baseDir, "analysis", "hash");
  }

  async sha1(fl: FileLike): Promise<[string, string]> {
    const p: Promise<[string, string]> = sha1(Buffer.from(fl.data)).then(hash => {
      const entry: [string, string] = [fl.name, hash];
      this.hashesSha1.push(entry);
      return entry;
    });
    return p;
  }

  async md5(fl: FileLike): Promise<[string, string]> {
    const p: Promise<[string, string]> = md5(Buffer.from(fl.data)).then(hash => {
      const entry: [string, string] = [fl.name, hash];
      this.hashesMd5.push(entry);
      return entry;
    });
    return p;
  }

  async crc32(fl: FileLike): Promise<[string, string]> {
    const p: Promise<[string, string]> = crc32(Buffer.from(fl.data)).then(hash => {
      const entry: [string, string] = [fl.name, hash];
      this.hashesCrc32.push(entry);
      return entry;
    });
    return p;
  }

  save() {
    if (!existsSync(this.baseDir)) {
      console.log(`creating base dir for HashCalc ${this.baseDir}`);
      mkdirSync(this.baseDir, {recursive: true});
    }
    console.log(`HashCalc base dir: ${this.baseDir}`);

    this.writeHashes("SHA1", SHA1_FILE, this.hashesSha1);
    this.writeHashes("MD5", MD5_FILE, this.hashesMd5);
    this.writeHashes("CRC32", CRC32_FILE, this.hashesCrc32);
  }

  private writeHashes(hashName: string, filename: string, hashes: [string, string][]) {
    const lastWritten = `written at ${new Date().toISOString()}`
    let filePath = path.join(this.baseDir, filename);
    const header = `# ${hashName} hashes ${lastWritten}`;
    const hashLines = hashes.map(v => `${v[1]} ${v[0]}`).join("\n");
    const data = `${header}\n${hashLines}\n`;
    writeFileSync(filePath, data, 'utf8');
  }

  /**
   * Whether all the hash files exist.
   */
  exists() {
    return fs.existsSync(path.join(this.baseDir, SHA1_FILE))
        && fs.existsSync(path.join(this.baseDir, MD5_FILE))
        && fs.existsSync(path.join(this.baseDir, CRC32_FILE));
  }

  private loadHash(filename: string, map: Array<[string, string]>) {
    const file = fs.readFileSync(path.join(this.baseDir, filename), 'utf8');
    let hashesLoaded = 0;
    file.split("\n").forEach((line) => {
      // skip comment lines or any line not matching expected format
      const re = line.match(/^([^# ])+\s(.*)$/);
      if (re) {
        hashesLoaded++;
        const hash = re[1];
        const path = re[2];
        map.push([path, hash]);
      }
    });
    return hashesLoaded;
  }

  load() {
    let hashesLoaded = this.loadHash(SHA1_FILE, this.hashesSha1);
    console.log(`loaded ${hashesLoaded} SHA1 hashes`);
    hashesLoaded = this.loadHash(MD5_FILE, this.hashesMd5);
    console.log(`loaded ${hashesLoaded} MD5 hashes`);
    hashesLoaded = this.loadHash(CRC32_FILE, this.hashesCrc32);
    console.log(`loaded ${hashesLoaded} CRC32 hashes`);
  }
}

export {HashCalc};