import {FileLike} from "../../FileLike.js";
import {FeatureExtractor} from "./FeatureExtractor.js";

/**
 * A signature descriptor for a specific file format
 */
interface FormatSignature {
  name: string;
  signature: number[];
  offset: number;
  mask?: number[];
}

/**
 * Extracts features based on known file format signatures
 * Often used for detecting headers and magic bytes that identify specific formats
 */
export class SignatureExtractor implements FeatureExtractor {
  private static readonly FEATURE_PREFIX = "signature_";
  private readonly signatures: FormatSignature[];

  /**
   * Creates a new SignatureExtractor with platform-specific signatures
   */
  constructor() {
    // Define known signatures for various platforms and file types
    this.signatures = [
      // Commodore 64 signatures
      {
        name: "c64_prg",
        signature: [0x01, 0x08],
        offset: 0
      },
      {
        name: "c64_basic_start",
        signature: [0x0B, 0x08],
        offset: 0
      },
      {
        name: "c64_cartridge",
        signature: [0xC3, 0xC2, 0xCD, 0x38, 0x30], // "CBM80"
        offset: 0
      },

      // VIC-20 signatures
      {
        name: "vic20_prg",
        signature: [0x01, 0x10],
        offset: 0
      },
      {
        name: "vic20_basic_start",
        signature: [0x0B, 0x10],
        offset: 0
      },

      // Apple II DOS signatures
      {
        name: "apple2_dos33",
        signature: [0xA5, 0x27, 0xC9, 0x09],
        offset: 0
      },
      {
        name: "apple2_prodos",
        signature: [0x01, 0x38, 0xB0, 0x03],
        offset: 0
      },

      // BBC Micro signatures
      {
        name: "bbc_basic",
        signature: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        offset: 0x07
      },

      // Common 6502 assembly patterns
      {
        name: "assembly_jmp_start",
        signature: [0x4C], // JMP instruction 
        offset: 0
      },
      {
        name: "assembly_sei_start",
        signature: [0x78], // SEI instruction
        offset: 0
      },
      {
        name: "assembly_lda_start",
        signature: [0xA9], // LDA immediate
        offset: 0
      }
    ];
  }

  /**
   * Extract signature-based features from a file
   * @param file File to analyze
   * @returns Array of [feature_name, value] tuples
   */
  extract(file: FileLike): [string, number][] {
    const features: [string, number][] = [];

    // Check each signature against the file
    for (const signature of this.signatures) {
      const match = this.matchSignature(file, signature);
      features.push([`${SignatureExtractor.FEATURE_PREFIX}${signature.name}`, match ? 1.0 : 0.0]);
    }

    // Add a feature counting how many signatures matched
    const matchCount = features.filter(([_, value]) => value > 0).length;
    features.push([`${SignatureExtractor.FEATURE_PREFIX}match_count`, matchCount]);

    return features;
  }

  /**
   * Add a custom signature to the extractor
   * @param signature New signature to add
   */
  addSignature(signature: FormatSignature): void {
    this.signatures.push(signature);
  }

  descriptor(): string {
    const n = this.signatures.length;
    return `SignatureExtractor (with ${n} signatures)`;
  }

  /**
   * Check if a file matches a given signature
   * @param file File to check
   * @param signature Signature to match
   * @returns true if the signature matches
   */
  private matchSignature(file: FileLike, signature: FormatSignature): boolean {
    const {offset, signature: signatureBytes, mask} = signature;

    // Check if file is big enough to contain the signature
    if (file.size < offset + signatureBytes.length) {
      return false;
    }

    // Check each byte of the signature
    for (let i = 0; i < signatureBytes.length; i++) {
      const fileBytePos = offset + i;
      const fileByte = file.data[fileBytePos];
      const sigByte = signatureBytes[i];

      // Apply mask if provided, otherwise exact match
      if (mask && mask[i]) {
        if ((fileByte & mask[i]) !== (sigByte & mask[i])) {
          return false;
        }
      } else if (fileByte !== sigByte) {
        return false;
      }
    }

    return true;
  }


}