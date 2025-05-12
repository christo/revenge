import {MemoryConfiguration} from "../MemoryConfiguration.js";
import {CbmStubSniffer} from "./CbmStubSniffer.js";
import {VIC20_SYM} from "./vic20.js";


/**
 * Hybrid sniffer of a machine code program with a basic stub.
 * Since some different memory configurations require different load addresses,
 * these can be distinguished just like pure BASIC prg files. However, not all
 * memory configuration requirements are evident from the load address. A
 * trace or simulation could give a good approximation here.
 */
class Vic20StubSniffer extends CbmStubSniffer {

  constructor(memory: MemoryConfiguration, hashTags: string[] = []) {
    super(memory, VIC20_SYM,
        `VIC-20 Machine Code with BASIC stub`,
        `VIC-20 (${memory.shortName}) 6502 Machine Code with BASIC stub`,
        ["vic-20", ...hashTags, memory.shortName]);
  }

}

export {Vic20StubSniffer};