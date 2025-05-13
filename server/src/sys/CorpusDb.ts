import {HashType} from "../common/analysis/HashType.js";
import {Authority} from "../common/db/Authority.js";
import {ContentDb} from "../common/db/ContentDb.js";
import {ContentEntity} from "../common/db/ContentEntity.js";
import {HashLookup} from "./HashLookup.js";

const CORPUS_AUTHORITY: Authority = {
  id: "syscorpus", name: "System Corpus", urls: []
};

/**
 * A content database that uses the system corpus as a back end.
 */
class CorpusDb implements ContentDb {
  private readonly hashLookup: HashLookup;

  constructor(hashLookup: HashLookup) {
    this.hashLookup = hashLookup;
  }

  supportedHashes(): HashType[] {
    return ["sha1", "md5", "crc32"];
  }

  findByHash(type: HashType, hash: string): ContentEntity[] {
    const names: string[] = [];
    if (type === "sha1") {
      names.push(...this.hashLookup.findSha1(hash));
    } else if (type === "md5") {
      names.push(...this.hashLookup.findMd5(hash));
    } else if (type === "crc32") {
      names.push(...this.hashLookup.findCrc32(hash));
    } else {
      throw Error(`Unknown hash type: ${type}`);
    }
    names.sort();
    // ignore hash collisions (only plausible with crc32)
    // so we assume each name is a duplicate of the same content,
    // therefore we should return a single entity with multiple names
    return [new ContentEntity(names, [], "", ["corpus"], CORPUS_AUTHORITY)];
  }

}

export {CorpusDb};