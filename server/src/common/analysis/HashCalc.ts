import {existsSync, mkdirSync, writeFileSync} from 'fs';
import {crc32, md5, sha1} from "hash-wasm";
import path from "path";
import {FileLike} from "../FileLike";
import 'dotenv/config';

const SHA1_FILE = `sha1.txt`;
const MD5_FILE = `md5.txt`;
const CRC32_FILE = `crc32.txt`;

class HashCalc {
  private hashesSha1: Array<Promise<[string, string]>> = [];
  private hashesMd5: Array<Promise<[string, string]>> = [];
  private hashesCrc32: Array<Promise<[string, string]>> = [];
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.join(baseDir, "analysis", "hash");
  }

  async sha1(fl: FileLike): Promise<[string, string]> {
    const p: Promise<[string, string]> = sha1(Buffer.from(fl.data)).then(hash => [fl.name, hash]);
    this.hashesSha1.push(p);
    return p;
  }

  async md5(fl: FileLike): Promise<[string, string]> {
    const p: Promise<[string, string]> = md5(Buffer.from(fl.data)).then(hash => [fl.name, hash]);
    this.hashesMd5.push(p);
    return p;
  }

  async crc32(fl: FileLike): Promise<[string, string]> {
    const p: Promise<[string, string]> = crc32(Buffer.from(fl.data)).then(hash => [fl.name, hash]);
    this.hashesCrc32.push(p);
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

  private writeHashes(hashName: string, filename: string, hashes: Promise<[string, string]>[]) {
    const lastWritten = `written at ${new Date().toISOString()}`
    let filePath = path.join(this.baseDir, filename);
    Promise.all(hashes).then(tuples => {
      const header = `# ${hashName} hashes ${lastWritten}`;
      const hashLines = tuples.map(v => `${v[1]} ${v[0]}`).join("\n");
      const data = `${header}\n${hashLines}`;
      writeFileSync(filePath, data, 'utf8');
    })
  }
}

export {HashCalc};