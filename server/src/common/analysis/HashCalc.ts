import {crc32, md5, sha1} from "hash-wasm";
import {HashLookup} from "../../sys/HashLookup.js";
import {FileLike} from "../FileLike.js";

/**
 * Performs content hash calculations for supported hash algorithms.
 */
class HashCalc implements HashLookup {

  private static NAME = 0;
  private static HASH = 1;

  private hashesSha1: Array<[string, string]> = [];
  private hashesMd5: Array<[string, string]> = [];
  private hashesCrc32: Array<[string, string]> = [];

  /**
   * Calculate SHA1 hash for a file
   */
  async sha1(fl: FileLike): Promise<[string, string]> {
    return sha1(Uint8Array.from(fl.data)).then(hash => {
      const entry: [string, string] = [fl.name, hash];
      this.hashesSha1.push(entry);
      return entry;
    });
  }

  /**
   * Calculate MD5 hash for a file
   */
  async md5(fl: FileLike): Promise<[string, string]> {
    return md5(Uint8Array.from(fl.data)).then(hash => {
      const entry: [string, string] = [fl.name, hash];
      this.hashesMd5.push(entry);
      return entry;
    });
  }

  /**
   * Calculate CRC32 hash for a file
   */
  async crc32(fl: FileLike): Promise<[string, string]> {
    return crc32(Uint8Array.from(fl.data)).then(hash => {
      const entry: [string, string] = [fl.name, hash];
      this.hashesCrc32.push(entry);
      return entry;
    });
  }

  /**
   * Add a SHA1 hash entry
   */
  addSha1Hash(name: string, hash: string): void {
    this.hashesSha1.push([name, hash]);
  }

  /**
   * Add an MD5 hash entry
   */
  addMd5Hash(name: string, hash: string): void {
    this.hashesMd5.push([name, hash]);
  }

  /**
   * Add a CRC32 hash entry
   */
  addCrc32Hash(name: string, hash: string): void {
    this.hashesCrc32.push([name, hash]);
  }

  /**
   * Get all SHA1 hashes
   */
  getHashesSha1(): Array<[string, string]> {
    return [...this.hashesSha1];
  }

  /**
   * Get all MD5 hashes
   */
  getHashesMd5(): Array<[string, string]> {
    return [...this.hashesMd5];
  }

  /**
   * Get all CRC32 hashes
   */
  getHashesCrc32(): Array<[string, string]> {
    return [...this.hashesCrc32];
  }

  findSha1(sha1: string): string[] {
    return this.hashesSha1.filter(h => h[HashCalc.HASH] === sha1).map(h => h[HashCalc.NAME]);
  }

  findMd5(md5: string): string[] {
    return this.hashesMd5.filter(h => h[HashCalc.HASH] === md5).map(h => h[HashCalc.NAME]);
  }

  findCrc32(crc32: string): string[] {
    return this.hashesCrc32.filter(h => h[HashCalc.HASH] === crc32).map(h => h[HashCalc.NAME]);
  }

  /**
   * Clear all hashes
   */
  clear(): void {
    this.hashesSha1 = [];
    this.hashesMd5 = [];
    this.hashesCrc32 = [];
  }
}

export {HashCalc};