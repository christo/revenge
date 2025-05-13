import {DisassemblyMeta} from "../asm/DisassemblyMeta.js";
import {DisassemblyMetaImpl} from "../asm/DisassemblyMetaImpl.js";
import {BlobSniffer, Stench} from "../BlobSniffer.js";
import {hex16, lsb, msb} from "../core.js";
import {LittleEndian} from "../Endian.js";
import {FileBlob} from "../FileBlob.js";
import {LogicalLine} from "../LogicalLine.js";
import {Memory} from "../Memory.js";
import {MemoryConfiguration} from "../MemoryConfiguration.js";
import {Tag} from "../Tag.js";
import {CBM_BASIC_2_0} from "./BasicDecoder.js";

function countTerm(haystack: string, needle: string): number {
  return (haystack.match(new RegExp(needle, "g")) || []).length;
}

function stripQuoted(s: string): string {
  return s.replaceAll(new RegExp(/"[^"]*("|$)/, "g"), "");
}

/**
 * Returns a count of the number of for and next tokens in the line
 * @param basicLine
 * @return [forCount, nextCount]
 */
function countForsAndNexts(basicLine: LogicalLine): [number, number] {
  return basicLine
      .getTags()
      .filter(t => t.isLine())
      .map(l => stripQuoted(l.value)).reduce((acc, line) => {
        acc[0] += countTerm(line, "for");
        acc[1] += countTerm(line, "next");
        return acc;
      }, [0, 0]);
}

const MAX_BASIC_LINE_BYTES = 255; // according to https://www.c64-wiki.com/wiki/BASIC

/**
 * Detects Commodore BASIC V2 program formats (c64 and vic20).
 */
class CbmBasicSniffer implements BlobSniffer {

  desc: string;
  name: string;
  hashTags: string[];
  private readonly memoryConfig: MemoryConfiguration;

  constructor(
      memoryConfig: MemoryConfiguration,
      name: string = "BASIC prg",
      desc: string = `CBM BASIC (${memoryConfig.shortName})`,
      hashTags: string[] = []
  ) {
    this.memoryConfig = memoryConfig;
    this.name = name;
    this.desc = desc;
    this.hashTags = Array.from(new Set(["basic", "cbm", ...hashTags]));
    this.hashTags.sort();
  }

  getMeta(): DisassemblyMeta {
    return DisassemblyMetaImpl.NULL_DISSASSEMBLY_META;
  }

  getMemoryConfig(): MemoryConfiguration {
    return this.memoryConfig;
  }

  /**
   * Simple basic sniff that considers monotonically increasing line numbers, balanced for/next pairs.
   *
   * @param fb
   */
  sniff(fb: FileBlob): Stench {
    const messages: string[] = [];

    // check if the start address bytes match the basic load address for our MemoryConfiguration
    const configuredLoad = this.memoryConfig.basicProgramStart;
    const byte0Match = fb.getBytes()[0] === lsb(configuredLoad);
    const byte1Match = fb.getBytes()[1] === msb(configuredLoad);
    let isBasic: number;
    if (byte0Match && byte1Match) {
      isBasic = 1.8;
    } else {
      isBasic = 0.2;
      const loadAddr = hex16(fb.read16(0));
      const expected = `${configuredLoad} (${this.memoryConfig.shortName})`;
      messages.push(`${fb.name} load address ${loadAddr} doesn't match ${expected}`);
    }
    // try decoding it as basic
    // count of fors minus count of nexts. Should always remain positive and end at zero
    let forSubNext = 0;
    try {
      const decoded = CBM_BASIC_2_0.decode(fb.asMemory() as Memory<LittleEndian>);
      let lastNum = -1;
      const lastAddr = -1;
      let byteCount = 0;
      for (let i1 = 0; i1 < decoded.getLines().length; i1++) {
        const ll: LogicalLine = decoded.getLines()[i1];
        const lineBytes = ll.getByteSize();
        if (lineBytes > MAX_BASIC_LINE_BYTES) {
          isBasic *= 0.01;
          messages.push(`line too long in ${fb.name}: ${lineBytes} bytes (score ${isBasic})`);
        }
        const [fors, nexts]: [number, number] = countForsAndNexts(ll)
        forSubNext += fors - nexts;
        if (forSubNext < 0) {
          isBasic *= 0.1;
          messages.push(`more nexts than fors in ${fb.name}: ${forSubNext} (score ${isBasic})`);
        }
        const i: Tag[] = ll.getTags();

        // BasicDecoder puts this tag on lines1
        const lnumStr = i.find(t => t.isLineNumber());
        const addrStr = i.find(t => t.isAddress());
        if (lnumStr !== undefined && addrStr !== undefined) {
          const thisNum = parseInt(lnumStr.value);
          if (lastNum !== -1 && lastNum >= thisNum) {
            // decrease in basic line numbers
            isBasic *= 0.1;
            messages.push(`decrease in basic line numbers for ${fb.name} (score ${isBasic})`)
          } else {
            isBasic *= 2.5;
          }
          if (lastAddr !== -1 && lastAddr >= parseInt(addrStr.value, 16)) {
            // next line address is allegedly lower? This ain't basic
            isBasic *= 0.1;
            messages.push(`lower next line address for ${fb.name} after line at address ${lastAddr} (score ${isBasic})`)
          } else {
            isBasic *= 2.5;
          }
          lastNum = thisNum;
          byteCount += lineBytes;
        } else {
          // maybe a machine language block that follows but this is a pure basic sniffer
          const basicSize = byteCount;
          // how much remains?
          const remainingSize = fb.getLength() - basicSize;
          // is the basic tiny?
          if (basicSize < 20 && remainingSize > basicSize) {
            // almost certain we should treat this as machine code at this point
            // although it could be data that a basic program simply reads.
            isBasic *= 0.001;
            messages.push("Large amount of non basic trailing data, giving up on basic")
          } else {
            isBasic *= 5 / (remainingSize * 5); // the more remaining bytes, the less like basic this looks
            console.log(`basic decoder: basicSize ${basicSize} remainingSize: ${remainingSize}`);
          }
        }
      }
      if (forSubNext !== 0) {
        isBasic *= 1 / (Math.abs(forSubNext) * 4);
        messages.push(`fors and next don't balance: ${forSubNext} (score ${isBasic})`);
      }
    } catch (_e) {
      // if we exploded, it's not BASIC!
      console.error(_e);
      isBasic = 0.01;
      messages.push(`basic decoder exploded: ${_e} (score ${isBasic})`);
    }
    // console.log(`basic sniff for ${fb.name}: ${isBasic}  - ${messages.join(", ")}`);
    return {score: isBasic, messages: messages};
  }
}

export {CbmBasicSniffer};