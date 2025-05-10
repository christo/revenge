import {FileLike} from "../../FileLike.js";
import {C64_16K_BASE_ADDRESS, C64_COMPUTER, C64_ROMH_BASE_ADDRESS} from "../../machine/cbm/c64.js";
import {Vic20} from "../../machine/cbm/vic20.js";
import {FeatureExtractor} from "./FeatureExtractor.js";

/**
 * Extracts features based on program load addresses
 * Uses the machine-specific information from vic20.ts and c64.ts
 * to identify platform-specific binary files by comparing load addresses.
 */
export class LoadAddressExtractor implements FeatureExtractor {
  // Use platform-specific constants from the machine definitions
  private readonly c64Addresses: number[];
  private readonly vic20Addresses: number[];

  constructor() {
    this.c64Addresses = [
      C64_COMPUTER.memory().basicProgramStart,
      C64_ROMH_BASE_ADDRESS,
      C64_16K_BASE_ADDRESS,
      0xC000,                                // Common machine code area
      0x2000,                                // Custom BASIC start
      0x4000                                 // Another common area
    ];

    // Get VIC-20 load addresses from the Vic20 memory configurations
    this.vic20Addresses = [
      Vic20.MEM_CONFIG.UNEX.basicProgramStart,       // 0x1001 - Unexpanded standard
      Vic20.MEM_CONFIG.EXP03K.basicProgramStart,     // 0x0401 - 3K expanded
      Vic20.MEM_CONFIG.EXP08K.basicProgramStart,     // 0x1201 - 8K expanded
      Vic20.MEM_CONFIG.EXP16K.basicProgramStart,     // 0x1201 - 16K expanded
      Vic20.MEM_CONFIG.EXP24K.basicProgramStart,     // 0x1201 - 24K expanded
      Vic20.MEM_CONFIG.EXP32K.basicProgramStart,     // 0x1201 - 32K expanded
      0xA000,                                        // Cartridge block 5
      0x2000,                                        // Cartridge block 1
      0x4000,                                        // Cartridge block 2
      0x6000                                         // Cartridge block 3
    ];
  }

  /**
   * Extract load address features from binary file
   * @param file Binary file to analyze
   * @returns Array of feature-value pairs
   */
  extract(file: FileLike): [string, number][] {
    const features: [string, number][] = [];
    const bytes = file.data;

    // Check if file is long enough to have a load address
    if (bytes.length < 2) {
      return [
        ["load_addr_value", 0],
        ["load_addr_is_c64", 0],
        ["load_addr_is_vic20", 0],
        ["load_addr_c64_similarity", 0],
        ["load_addr_vic20_similarity", 0],
        ["load_addr_platform_ratio", 0.5]
      ];
    }

    // Extract little-endian load address from first two bytes
    const loadAddress = bytes[0] | (bytes[1] << 8);

    // Check exact matches
    const isC64Address = this.c64Addresses.includes(loadAddress) ? 1 : 0;
    const isVic20Address = this.vic20Addresses.includes(loadAddress) ? 1 : 0;

    // Calculate similarity - minimum distance to known addresses
    // Normalize by 0x10000 to get values 0-1
    const c64Similarity = 1.0 - Math.min(
        ...this.c64Addresses.map(addr => Math.abs(addr - loadAddress) / 0x10000)
    );

    const vic20Similarity = 1.0 - Math.min(
        ...this.vic20Addresses.map(addr => Math.abs(addr - loadAddress) / 0x10000)
    );

    // Calculate a ratio feature (positive for C64, negative for VIC20)
    const platformRatio = (c64Similarity - vic20Similarity + 1) / 2; // Scale to 0-1

    // Add all extracted features
    features.push(["load_addr_value", loadAddress / 0x10000]); // Normalized address value
    features.push(["load_addr_is_c64", isC64Address]);
    features.push(["load_addr_is_vic20", isVic20Address]);
    features.push(["load_addr_c64_similarity", c64Similarity]);
    features.push(["load_addr_vic20_similarity", vic20Similarity]);
    features.push(["load_addr_platform_ratio", platformRatio]);

    // Check for BASIC line structure as additional evidence
    // Skip load address (2 bytes), then check the link pointer to next line (2 bytes)
    if (bytes.length >= 6) {
      const basicLineLink = bytes[2] | (bytes[3] << 8);
      // Basic line links should be within reasonable bounds
      const validBasicLineLink = basicLineLink > 4 && basicLineLink < bytes.length ? 1 : 0;
      features.push(["load_addr_has_valid_basic_link", validBasicLineLink]);

      // Check for common BASIC tokens at line start (after line number)
      // Common tokens: 0x9E (SYS), 0x8F (REM), 0x99 (GOTO)
      if (bytes.length >= 7) {
        const hasBasicToken = [0x9E, 0x8F, 0x99].includes(bytes[6]) ? 1 : 0;
        features.push(["load_addr_has_basic_token", hasBasicToken]);
      }
    }

    return features;
  }

  /**
   * Returns a description of this extractor for reporting
   */
  descriptor(): string {
    return `LoadAddressExtractor
Features based on platform-specific load addresses from machine definitions
C64 addresses: ${this.c64Addresses.length} unique addresses
VIC20 addresses: ${this.vic20Addresses.length} unique addresses`;
  }
}