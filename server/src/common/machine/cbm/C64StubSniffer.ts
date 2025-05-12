import {Stench} from "../BlobSniffer.js";
import {FileBlob} from "../FileBlob.js";
import {MemoryConfiguration} from "../MemoryConfiguration.js";
import {C64, C64_SYM} from "./c64.js";
import {CbmStubSniffer} from "./CbmStubSniffer.js";


/**
 * Hybrid sniffer of a machine code program with a basic stub.
 * Since some different memory configurations require different load addresses,
 * these can be distinguished just like pure BASIC prg files. However, not all
 * memory configuration requirements are evident from the load address. A
 * trace or simulation could give a good approximation here.
 */
class C64StubSniffer extends CbmStubSniffer {

  constructor(memory: MemoryConfiguration = C64.STANDARD_MEMORY, hashTags: string[] = []) {
    super(memory, C64_SYM,
        `C64 Machine Code with BASIC stub`,
        `C64 6510 Machine Code with BASIC stub`,
        ["c64", ...hashTags, memory.shortName]);
  }


  sniff(fb: FileBlob): Stench {
    const stench = super.sniff(fb);
    console.log(`c64 stub sniff for ${fb.name}: ${stench.score}  - ${stench.messages.join(", ")}`);
    return stench;
  }
}

export {C64StubSniffer};