import {Addr} from "./core.js";

/**
 * Immutable config for available memory, basic load address etc.
 *
 */
class MemoryConfiguration {

  // TODO generalise this to describe VIC20 expansion RAM in banks, C64 and 128
  readonly name: string;

  /** Very Commodore-specific, start address of BASIC program. */
  readonly basicProgramStart: Addr;

  /**
   * A short UI string that uniquely annotates this memory configuration. In the case of C64 standard memory
   * configuration, this can be empty. Does not need to include any machine identifier.
   */
  readonly shortName: string;

  /**
   * Create a memory configuration.
   *
   * @param name for display
   * @param basicProgramStart 16 bit address where BASIC programs are loaded
   * @param shortName short designation for UI
   */
  constructor(name: string, basicProgramStart: Addr, shortName = "") {
    // future: various independent block configurations
    this.name = name;
    this.basicProgramStart = basicProgramStart;
    this.shortName = shortName;
  }
}

export {MemoryConfiguration};