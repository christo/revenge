import {HashType} from "../analysis/HashType.js";
import {ContentEntity} from "./ContentEntity.js";

/**
 * Represents a database for identifying software. Queries supported include by content hash,
 * name, author etc.
 *
 */
export interface ContentDb {

  supportedHashes(): HashType[];

  /**
   * Find content entities by hash. Multiple results are duplicates (or hash collisions).
   * @param type hash algorithm
   * @param hash value
   * @returns possibly empty entities identified by content
   */
  findByHash(type: HashType, hash: string): ContentEntity[];

}