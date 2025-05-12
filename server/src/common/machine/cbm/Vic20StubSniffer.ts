import {Disassembler} from "../asm/Disassembler.js";
import {DisassemblyMeta} from "../asm/DisassemblyMeta.js";
import {DisassemblyMetaImpl} from "../asm/DisassemblyMetaImpl.js";
import {BlobSniffer, Stench} from "../BlobSniffer.js";
import {FileBlob} from "../FileBlob.js";
import {MemoryConfiguration} from "../MemoryConfiguration.js";
import {Mos6502} from "../mos6502.js";
import {TOKEN_SPACE, TOKEN_SYS} from "./BasicDecoder.js";
import {BasicStubDisassemblyMeta} from "./BasicStubDisassemblyMeta.js";
import {trace} from "./cbm.js";
import {CbmBasicSniffer} from "./CbmBasicSniffer.js";
import {Petscii} from "./petscii.js";
import {Vic20, VIC20_SYM} from "./vic20.js";

/**
 * Guesses the memory configuration based on the provided file blob.
 *
 * @param {FileBlob} fileBlob - The file blob to analyse for determining the memory configuration.
 * @return {MemoryConfiguration | undefined} The matching memory configuration, or undefined if no match is found.
 */
function guessMemoryConfig(fileBlob: FileBlob): MemoryConfiguration | undefined {
  const loadAddress = fileBlob.read16(0);
  return Vic20.MEMORY_CONFIGS.find(mc => mc.basicProgramStart === loadAddress);
}

/**
 * Hybrid sniffer of a machine code program with a basic stub.
 * Since some different memory configurations require different load addresses,
 * these can be distinguished just like pure BASIC prg files. However, not all
 * memory configuration requirements are evident from the load address. A
 * trace or simulation could give a good approximation here.
 */
class Vic20StubSniffer extends CbmBasicSniffer implements BlobSniffer {
  private dm: DisassemblyMeta = DisassemblyMetaImpl.NULL_DISSASSEMBLY_META;

  constructor(memory: MemoryConfiguration, hashTags: string[] = []) {
    super(memory,
        `VIC-20 Machine Code with BASIC stub`,
        `VIC-20 (${memory.shortName}) 6502 Machine Code with BASIC stub`,
        ["basic", "machine-code", ...hashTags, memory.shortName]);
  }

  /**
   * Stateful, resets DisassemblyMeta with config derived from contents of fileblob.
   * @param fb the binary
   */
  sniff(fb: FileBlob): Stench {
    let score = 1;
    const messages: string[] = [];
    const guessedMemoryConfig = guessMemoryConfig(fb);
    if (!guessedMemoryConfig) {
      // cannot derive memory configuration, cannot work as a basic stub
      console.log("no memory config");
      score *= 0.1;
    } else if (guessedMemoryConfig.basicProgramStart !== this.getMemoryConfig().basicProgramStart) {
      // guessed memory config is not the same as configured one
      score *= 0.1;
    } else {
      score *= 3;
      if (fb.getLength() < 20) {
        messages.push("binary too small to be machine code with basic stub");
        // not enough bytes to have a basic stub
        score *= 0.1;
      } else {
        score *= 2;
        // temporary
        const SYS_OFFSET = 6;
        if (fb.read8(SYS_OFFSET) !== TOKEN_SYS) {
          messages.push("Could not find the sys token");
          // can't find the sys token
          score *= 0.5;
        } else {
          score *= 4;
          let i = SYS_OFFSET + 1;
          // skip any spaces
          while (fb.read8(i) === TOKEN_SPACE) {
            i++;
          }
          // read decimal address
          const intString = Petscii.readDigits(fb.asMemory(), i);
          if (intString.length > 0) {
            try {
              const startAddress = parseInt(intString, 10);
              if (!isNaN(startAddress)) {
                score *= 4;
                // don't attempt to parse any more basic manually, too many ways to fail
                // future: use a more complete basic parser implementation to handle edge cases
                const entryPointDesc = `BASIC stub SYS ${startAddress}`;
                this.dm = new BasicStubDisassemblyMeta(this.getMemoryConfig(), VIC20_SYM, startAddress, entryPointDesc)
                const disasm = new Disassembler(Mos6502.ISA, fb, this.dm);
                const traceResult = trace(disasm, fb, this.dm);
                if (traceResult.steps > 5) {
                  messages.push("more than 5 steps traced");
                  score *= 2;
                } else {
                  messages.push("less than 5 steps traced");
                  score *= 0.5;
                }
              } else {
                score *= 0.4;
                messages.push(`sys argument couldn't be parsed as an integer: "${intString}"`);
              }
            } catch (_e) {
              score *= 0.4;
              messages.push("died trying to disassemble during sniff");
            }
          } else {
            score *= 0.4
            messages.push(`couldn't find sys command argument`);
          }
        }
      }
    }
    return {score: score, messages: messages};
  }


  getMeta(): DisassemblyMeta {
    return this.dm;
  }
}

export {Vic20StubSniffer};