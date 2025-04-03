import {DisassemblyMeta} from "./asm/DisassemblyMeta.ts";
import {FileBlob} from "./FileBlob.ts";

/**
 * Abstraction for scoring relative confidence in file content categorisation.
 */
interface BlobSniffer {
  name: string;
  desc: string;
  tags: string[];

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

export {type BlobSniffer};