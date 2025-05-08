import {FileLike} from "../FileLike.js";
import {FeatureExtractor} from "./FeatureExtractor.js";

/**
 * A signature descriptor for a specific file format
 */
interface FormatSignature {
  name: string;
  signature: number[];
  offset: number;
  mask?: number[];
  // New fields for enhanced functionality
  description?: string;
  weight?: number;         // Importance weight for this signature (default: 1.0)
  platform?: string;       // Associated platform identifier
  variableLength?: boolean; // If true, signature can match partial length
  confidence?: number;     // How specific this signature is (0.0-1.0)
}

/**
 * Enhanced extractor for file format signatures with expanded signature set
 * and improved detection capabilities for retro computer formats
 */
export class EnhancedSignatureExtractor implements FeatureExtractor {
  private static readonly FEATURE_PREFIX = "signature_";
  private readonly signatures: FormatSignature[];

  /**
   * Creates a new SignatureExtractor with expanded platform-specific signatures
   */
  constructor() {
    // Define expanded signature set for various platforms and file types
    this.signatures = [
      // ======== Commodore 64 signatures ========
      // Common C64 load addresses
      {
        name: "c64_prg_basic",
        signature: [0x01, 0x08],
        offset: 0,
        description: "C64 BASIC program (load address $0801)",
        platform: "c64",
        confidence: 0.8
      },
      {
        name: "c64_basic_start",
        signature: [0x0B, 0x08],
        offset: 0,
        description: "C64 BASIC program alt start",
        platform: "c64",
        confidence: 0.7
      },
      {
        name: "c64_sys_1300",
        signature: [0x0C, 0x05],
        offset: 0,
        description: "C64 program (load address $050C)",
        platform: "c64",
        confidence: 0.7
      },
      {
        name: "c64_prg_2000",
        signature: [0x00, 0x20],
        offset: 0,
        description: "C64 program (load address $2000)",
        platform: "c64",
        confidence: 0.6
      },
      {
        name: "c64_prg_4000",
        signature: [0x00, 0x40],
        offset: 0,
        description: "C64 program (load address $4000)",
        platform: "c64",
        confidence: 0.6
      },
      {
        name: "c64_prg_c000",
        signature: [0x00, 0xC0],
        offset: 0,
        description: "C64 program (load address $C000)",
        platform: "c64",
        confidence: 0.6
      },
      {
        name: "c64_cartridge_cbm80",
        signature: [0xC3, 0xC2, 0xCD, 0x38, 0x30], // "CBM80"
        offset: 0,
        description: "C64 cartridge with CBM80 signature",
        platform: "c64",
        confidence: 0.9
      },
      {
        name: "c64_cartridge_header",
        signature: [0xC5, 0x00, 0x00, 0x00], // CRT header start ($C5xx)
        offset: 0,
        mask: [0xF0, 0x00, 0x00, 0x00],
        description: "C64 cartridge image with header",
        platform: "c64",
        confidence: 0.8
      },
      {
        name: "c64_cartridge_init",
        signature: [0x4C, 0xF8, 0xFF], // Common cartridge init sequence
        offset: 0,
        description: "C64 cartridge initialization code",
        platform: "c64",
        confidence: 0.85
      },
      {
        name: "c64_cartridge_8000",
        signature: [0x00, 0x80], // $8000 start address
        offset: 0,
        description: "C64 cartridge at $8000",
        platform: "c64",
        confidence: 0.85
      },
      {
        name: "c64_cartridge_e000",
        signature: [0x00, 0xE0], // $E000 start address
        offset: 0,
        description: "C64 cartridge at $E000",
        platform: "c64",
        confidence: 0.85
      },
      {
        name: "c64_cartridge_magic",
        signature: [0x43, 0x36, 0x34, 0x20, 0x43, 0x41, 0x52, 0x54], // "C64 CART"
        offset: 0x10, // Often found at header offset
        variableLength: true,
        description: "C64 cartridge magic string",
        platform: "c64",
        confidence: 0.95
      },
      // CRT file format signatures (modern emulator cartridge file)
      {
        name: "c64_crt_header",
        signature: [0x43, 0x36, 0x34, 0x20, 0x43, 0x41, 0x52, 0x54, 0x52, 0x49, 0x44, 0x47, 0x45, 0x20, 0x20, 0x20], // "C64 CARTRIDGE   "
        offset: 0,
        variableLength: true,
        description: "C64 CRT file header",
        platform: "c64",
        confidence: 0.95
      },
      {
        name: "c64_crt_header_alt",
        signature: [0x43, 0x36, 0x34], // Just "C64" at start
        offset: 0,
        description: "C64 CRT file header (short)",
        platform: "c64",
        confidence: 0.9
      },
      {
        name: "c64_crt_chip",
        signature: [0x43, 0x48, 0x49, 0x50], // "CHIP" marker in CRT
        offset: 0x40, // Chip headers often start around here
        variableLength: true,
        description: "C64 CRT chip marker",
        platform: "c64",
        confidence: 0.9
      },
      {
        name: "c64_basic_line0",
        signature: [0x0C, 0x08, 0x0A, 0x00, 0x9E], // Line start + '10' + SYS token
        offset: 0,
        description: "C64 BASIC program with SYS command on first line",
        platform: "c64",
        confidence: 0.85
      },
      {
        name: "c64_basic_rem",
        signature: [0x0C, 0x08, 0x0A, 0x00, 0x8F], // Line start + '10' + REM token
        offset: 0,
        description: "C64 BASIC program with REM on first line",
        platform: "c64",
        confidence: 0.8
      },

      // SID music files
      {
        name: "c64_sid_magic",
        signature: [0x50, 0x53, 0x49, 0x44], // "PSID"
        offset: 0,
        description: "C64 SID music file (PSID)",
        platform: "c64",
        confidence: 0.95
      },
      {
        name: "c64_rsid_magic",
        signature: [0x52, 0x53, 0x49, 0x44], // "RSID"
        offset: 0,
        description: "C64 SID music file (RSID)",
        platform: "c64",
        confidence: 0.95
      },

      // ======== VIC-20 signatures ========
      // VIC-20 load addresses (unexpanded, +3K, +8K, +16K, +24K)
      {
        name: "vic20_prg_unexpanded",
        signature: [0x01, 0x10],
        offset: 0,
        description: "VIC-20 BASIC program (unexpanded, load address $1001)",
        platform: "vic20",
        confidence: 0.95
      },
      {
        name: "vic20_prg_3k",
        signature: [0x01, 0x04],
        offset: 0,
        description: "VIC-20 BASIC program (+3K, load address $0401)",
        platform: "vic20",
        confidence: 0.9
      },
      {
        name: "vic20_basic_1201",
        signature: [0x01, 0x12],
        offset: 0,
        description: "VIC-20 BASIC program (+8K, load address $1201)",
        platform: "vic20",
        confidence: 0.9
      },
      {
        name: "vic20_basic_1201_alt",
        signature: [0x02, 0x12],
        offset: 0,
        description: "VIC-20 BASIC alternate start",
        platform: "vic20",
        confidence: 0.8
      },
      {
        name: "vic20_basic_start_token",
        signature: [0x0B, 0x10, 0x00, 0x00, 0x9E],
        offset: 0,
        description: "VIC-20 BASIC with SYS token",
        platform: "vic20",
        confidence: 0.9
      },
      // Common VIC-20 machine language entry points
      {
        name: "vic20_ml_standard",
        signature: [0x20, 0x00, 0x70], // JSR $7000 (common ML entry)
        offset: 2,
        description: "VIC-20 ML routine at $7000",
        platform: "vic20",
        confidence: 0.85
      },
      {
        name: "vic20_a000_block",
        signature: [0x00, 0xA0],
        offset: 0,
        description: "VIC-20 cartridge at $A000",
        platform: "vic20",
        confidence: 0.8
      },
      {
        name: "vic20_2000_block",
        signature: [0x00, 0x20],
        offset: 0,
        description: "VIC-20 block at $2000",
        platform: "vic20",
        confidence: 0.7
      },
      {
        name: "vic20_color_ram_access",
        signature: [0x00, 0x96], // VIC-20 color RAM
        offset: 15, // Check a bit into the file 
        mask: [0xFF, 0xF0], // Only check high nibble
        description: "VIC-20 color RAM access",
        platform: "vic20",
        confidence: 0.7,
        variableLength: true
      },

      // VIC-20 BASIC line structures 
      {
        name: "vic20_basic_rem_1001",
        signature: [0x0C, 0x10, 0x0A, 0x00, 0x8F], // Line link + '10' + REM token
        offset: 0,
        description: "VIC-20 BASIC program with REM on first line",
        platform: "vic20",
        confidence: 0.85
      },
      {
        name: "vic20_basic_sys_1001",
        signature: [0x0C, 0x10, 0x0A, 0x00, 0x9E], // Line link + '10' + SYS token
        offset: 0,
        description: "VIC-20 BASIC program with SYS on first line",
        platform: "vic20",
        confidence: 0.9
      },

      // VIC-20 cartridge formats
      {
        name: "vic20_cartridge",
        signature: [0x41, 0x30, 0xC3, 0xC2, 0xCD], // "A0CBM"
        offset: 0,
        description: "VIC-20 cartridge image",
        platform: "vic20",
        confidence: 0.9
      },
      {
        name: "vic20_cart_vector_a000",
        signature: [0x00, 0xA0],
        offset: 0,
        description: "VIC-20 cartridge A000 vector",
        platform: "vic20",
        confidence: 0.6
      },

      // VIC-20 machine code at common addresses
      {
        name: "vic20_mc_1c00",
        signature: [0x00, 0x1C],
        offset: 0,
        description: "VIC-20 machine code at $1C00",
        platform: "vic20",
        confidence: 0.6
      },

      // ======== ZX Spectrum signatures ========
      {
        name: "zx_snapshot_z80",
        signature: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Z80 signature pattern
        offset: 30,
        description: "ZX Spectrum .Z80 snapshot format",
        platform: "zx",
        confidence: 0.9
      },
      {
        name: "zx_snapshot_sna",
        signature: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // SNA registers
        offset: 0,
        description: "ZX Spectrum .SNA snapshot format",
        platform: "zx",
        confidence: 0.8
      },
      {
        name: "zx_tap_standard",
        signature: [0x13, 0x00, 0x00], // Standard tape block header
        offset: 0,
        description: "ZX Spectrum .TAP tape format",
        platform: "zx",
        confidence: 0.9
      },

      // ======== Atari 8-bit signatures ========
      {
        name: "atari_executable",
        signature: [0xFF, 0xFF], // XEX header
        offset: 0,
        description: "Atari 8-bit executable (.XEX)",
        platform: "atari8bit",
        confidence: 0.9
      },
      {
        name: "atari_executable_with_address",
        signature: [0xFF, 0xFF, 0x00, 0x60], // XEX with $6000 load address
        offset: 0,
        description: "Atari 8-bit executable loading at $6000",
        platform: "atari8bit",
        confidence: 0.9
      },
      {
        name: "atari_basic_tokenized",
        signature: [0x00, 0x03, 0x00, 0x07], // BASIC tokens
        offset: 0,
        description: "Atari BASIC tokenized program",
        platform: "atari8bit",
        confidence: 0.8
      },

      // ======== MSX signatures ========
      {
        name: "msx_basic",
        signature: [0xD3, 0xD3, 0xD3], // MSX BASIC header
        offset: 0,
        description: "MSX BASIC program",
        platform: "msx",
        confidence: 0.8
      },
      {
        name: "msx_rom_signature",
        signature: [0x41, 0x42], // 'AB' ROM signature
        offset: 0,
        description: "MSX ROM file",
        platform: "msx",
        confidence: 0.8
      },

      // ======== NES/Famicom signatures ========
      {
        name: "nes_rom",
        signature: [0x4E, 0x45, 0x53, 0x1A], // "NES" + EOF
        offset: 0,
        description: "Nintendo Entertainment System ROM (iNES format)",
        platform: "nes",
        confidence: 0.95
      },

      // ======== Apple II signatures ========
      // Existing Apple II signatures
      {
        name: "apple2_dos33",
        signature: [0xA5, 0x27, 0xC9, 0x09],
        offset: 0,
        description: "Apple II DOS 3.3 file",
        platform: "apple2",
        confidence: 0.8
      },
      {
        name: "apple2_prodos",
        signature: [0x01, 0x38, 0xB0, 0x03],
        offset: 0,
        description: "Apple II ProDOS file",
        platform: "apple2",
        confidence: 0.8
      },

      // ======== BBC Micro signatures ========
      // Existing BBC Micro signatures
      {
        name: "bbc_basic",
        signature: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        offset: 0x07,
        description: "BBC Micro BASIC program",
        platform: "bbc",
        confidence: 0.8
      },

      // ======== Common 6502 assembly patterns ========
      // These are machine-agnostic but useful for identification
      {
        name: "assembly_jmp_start",
        signature: [0x4C], // JMP instruction 
        offset: 0,
        description: "6502 JMP instruction at start",
        confidence: 0.4
      },
      {
        name: "assembly_sei_start",
        signature: [0x78], // SEI instruction
        offset: 0,
        description: "6502 SEI instruction at start",
        confidence: 0.4
      },
      {
        name: "assembly_lda_start",
        signature: [0xA9], // LDA immediate
        offset: 0,
        description: "6502 LDA immediate at start",
        confidence: 0.4
      },
      {
        name: "assembly_jsr_pattern",
        signature: [0x20], // JSR instruction
        offset: 2, // Check after potential JMP
        description: "6502 JSR instruction in header",
        confidence: 0.4
      },
      {
        name: "assembly_cli_pattern",
        signature: [0x58], // CLI instruction
        offset: 2, // Often after SEI
        description: "6502 CLI instruction in header",
        confidence: 0.4
      },

      // ======== Common code patterns ========
      // These look for typical subroutine patterns in 6502 code
      {
        name: "pattern_init_sequence",
        signature: [0x78, 0xA9, 0x00, 0x8D], // SEI, LDA #0, STA
        offset: 0,
        description: "Typical 6502 initialization sequence",
        confidence: 0.7
      },
      {
        name: "pattern_interrupt_handler",
        signature: [0x48, 0x8A, 0x48, 0x98, 0x48], // PHA, TXA, PHA, TYA, PHA
        offset: 0,
        variableLength: true,
        description: "6502 interrupt handler pattern",
        confidence: 0.7
      }
    ];
  }

  /**
   * Extract enhanced signature-based features from a file
   * @param file File to analyze
   * @returns Array of [feature_name, value] tuples
   */
  extract(file: FileLike): [string, number][] {
    const features: [string, number][] = [];

    // Track platform-specific signature matches
    const platformMatches = new Map<string, number>();

    // Check each signature against the file
    for (const signature of this.signatures) {
      // Match the signature
      const matchResult = this.matchSignature(file, signature);

      // If we have a match and a platform is specified, count it
      if (matchResult && signature.platform) {
        const currentCount = platformMatches.get(signature.platform) || 0;
        platformMatches.set(
            signature.platform,
            currentCount + (signature.confidence || 1.0)
        );
      }

      // Add the signature feature
      features.push([
        `${EnhancedSignatureExtractor.FEATURE_PREFIX}${signature.name}`,
        matchResult ? (signature.confidence || 1.0) : 0.0
      ]);
    }

    // Add a feature counting how many signatures matched
    const matchCount = features.filter(([_, value]) => value > 0).length;
    features.push([`${EnhancedSignatureExtractor.FEATURE_PREFIX}match_count`, matchCount]);

    // Create a more refined platform scoring system
    // Filter irrelevant platforms like "has" and "basic" that aren't actual platforms
    const relevantPlatforms = new Map<string, number>();
    for (const [platform, count] of platformMatches.entries()) {
      // Only consider actual platform identifiers
      if (platform === "c64" || platform === "vic20" ||
          platform === "zx" || platform === "atari8bit" ||
          platform === "msx" || platform === "nes" ||
          platform === "apple2" || platform === "bbc") {
        relevantPlatforms.set(platform, count);
      }
    }

    // Add features for platform signature matches
    for (const [platform, count] of relevantPlatforms.entries()) {
      features.push([
        `${EnhancedSignatureExtractor.FEATURE_PREFIX}platform_${platform}`,
        count
      ]);
    }

    // Add dominant platform feature (platform with most matches)
    if (relevantPlatforms.size > 0) {
      let dominantPlatform = "";
      let highestCount = 0;

      for (const [platform, count] of relevantPlatforms.entries()) {
        if (count > highestCount) {
          dominantPlatform = platform;
          highestCount = count;
        }
      }

      features.push([
        `${EnhancedSignatureExtractor.FEATURE_PREFIX}dominant_platform`,
        dominantPlatform === "c64" ? 1.0 : (dominantPlatform === "vic20" ? 0.0 : 0.5)
      ]);
    }

    // Additional structural analysis features
    features.push(...this.extractStructuralFeatures(file));

    return features;
  }

  /**
   * Add a custom signature to the extractor
   * @param signature New signature to add
   */
  addSignature(signature: FormatSignature): void {
    this.signatures.push(signature);
  }

  /**
   * Check if a file matches a given signature with enhanced capabilities
   * @param file File to check
   * @param signature Signature to match
   * @returns true if the signature matches
   */
  private matchSignature(file: FileLike, signature: FormatSignature): boolean {
    const {offset, signature: signatureBytes, mask, variableLength} = signature;

    // Check if file is big enough to contain the signature
    if (file.size < offset + signatureBytes.length) {
      return false;
    }

    // Variable length signatures allow partial matches
    const matchLength = variableLength
        ? Math.min(signatureBytes.length, file.size - offset)
        : signatureBytes.length;

    // Check each byte of the signature
    for (let i = 0; i < matchLength; i++) {
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

  /**
   * Extract additional structural features from file content
   * @param file File to analyze
   * @returns Additional structural features
   */
  private extractStructuralFeatures(file: FileLike): [string, number][] {
    const features: [string, number][] = [];

    // Check for BASIC line structure (for C64/VIC-20)
    if (file.size >= 5) {
      // Check if the file looks like it has valid BASIC line links
      let validLineLinks = true;
      let lineCount = 0;
      let position = 2; // Skip load address

      // Try to follow BASIC line links for up to 10 links
      for (let i = 0; i < 10 && position < file.size - 4; i++) {
        // Get the line link pointer (little endian)
        const lineLink = file.data[position] | (file.data[position + 1] << 8);

        // If zero, we've reached the end of the program
        if (lineLink === 0) {
          break;
        }

        // If the link points backward or too far forward, it's not a valid BASIC program
        if (lineLink < position || lineLink >= file.size) {
          validLineLinks = false;
          break;
        }

        // Move to the next line
        position = lineLink;
        lineCount++;
      }

      features.push([
        `${EnhancedSignatureExtractor.FEATURE_PREFIX}valid_basic_structure`,
        validLineLinks && lineCount > 0 ? 1.0 : 0.0
      ]);

      features.push([
        `${EnhancedSignatureExtractor.FEATURE_PREFIX}basic_line_count`,
        lineCount / 10.0 // Normalize to 0.0-1.0 range
      ]);
    }

    // Check for specific memory patterns with reduced confidence values
    // so they don't dominate platform-specific signatures
    features.push([
      `${EnhancedSignatureExtractor.FEATURE_PREFIX}has_low_memory_access`,
      this.checkMemoryPatterns(file, [0x00, 0x01, 0x02, 0x03]) ? 0.4 : 0.0
    ]);

    features.push([
      `${EnhancedSignatureExtractor.FEATURE_PREFIX}has_vic_registers_access`,
      this.checkMemoryPatterns(file, [0x00, 0x90]) ? 0.5 : 0.0 // VIC-20 VIC chip
    ]);

    features.push([
      `${EnhancedSignatureExtractor.FEATURE_PREFIX}has_sid_registers_access`,
      this.checkMemoryPatterns(file, [0x00, 0xD4]) ? 0.5 : 0.0 // C64 SID chip
    ]);

    return features;
  }

  /**
   * Check if file contains access to specific memory patterns
   * @param file File to check
   * @param pattern Memory pattern to look for
   * @returns true if pattern is found
   */
  private checkMemoryPatterns(file: FileLike, pattern: number[]): boolean {
    // Look for common instruction patterns that access memory
    // For example, LDA $9000 would be [0xAD, 0x00, 0x90]
    const memoryAccessOpcodes = [0xAD, 0x8D, 0xAE, 0x8E, 0xAC, 0x8C]; // LDA, STA, LDX, STX, LDY, STY abs

    // Scan file for memory access patterns
    for (let i = 0; i < file.size - 3; i++) {
      const opcode = file.data[i];

      // If this is a memory access opcode
      if (memoryAccessOpcodes.includes(opcode)) {
        // Check if the address matches our pattern (little endian)
        if (file.data[i + 1] === pattern[0] && file.data[i + 2] === pattern[1]) {
          return true;
        }
      }
    }

    return false;
  }
}