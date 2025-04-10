import {DisassemblyMeta} from "./asm/DisassemblyMeta.ts";
import {DisassemblyMetaImpl} from "./asm/DisassemblyMetaImpl.ts";
import {BlobTypeSniffer} from "./BlobTypeSniffer.ts";
import {FileBlob} from "./FileBlob.ts";

/**
 * Abstraction for scoring relative confidence in file content categorisation.
 */
interface BlobSniffer {
  name: string;
  desc: string;
  hashTags: string[];

  /**
   * Produces a score for the given FileBlob, higher numbers indicate a corresponding higher confidence
   * of a match. Component values are coefficients that multiply to produce aggregate scores. A value
   * of 1 signifies no indication of a match, less than 1 signifies unlikeliness and greater than 1
   * signifies increasing confidence. Zero is absolute certainty. Negative values must not be returned.
   *
   * @param fb the file contents to sniff
   */
  sniff(fb: FileBlob): number;

  /**
   * FUTURE: This smells, it's a bag of disassembly-specific detail transported from the thing that knows
   *  about the file contents and the disassembler who needs to construct the {@link DataView}. Is there
   *  a generic way to bundle this stuff? What's the common API such that ignorant intermediaries can be
   *  blissfull as they work at a non-specific altitude? Consider an inversion or use generics.
   */
  getMeta(): DisassemblyMeta;
}

const UNKNOWN_BLOB: BlobSniffer = {
  name: "unknown",
  desc: "content of no known type",
  hashTags: ["unknown"],
  getMeta(): DisassemblyMeta {
    return DisassemblyMetaImpl.NULL_DISSASSEMBLY_META;
  },
  sniff(_fb: FileBlob): number {
    return 0;
  },
};


/**
 * Returns the sniffer with the highest score
 * @param someSniffers
 * @param fileBlob
 */
function bestSniffer(someSniffers: BlobSniffer[], fileBlob: FileBlob) {
  if (someSniffers.length === 0) {
    throw Error("Zero sniffs given");
  }
  // TODO maybe wrap the sniffers in transparent cache these?
  someSniffers.reduce((acc: BlobSniffer, cur: BlobSniffer) => {
    return cur.sniff(fileBlob) > acc.sniff(fileBlob) ? cur : acc;
  }, UNKNOWN_BLOB);
}

export {type BlobSniffer, bestSniffer, UNKNOWN_BLOB};
