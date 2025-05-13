export interface HashLookup {
  findSha1(sha1: string): string[];

  findMd5(md5: string): string[];

  findCrc32(crc32: string): string[];
}