import {DisassemblyMeta} from "../asm/DisassemblyMeta.js";
import {DisassemblyMetaImpl} from "../asm/DisassemblyMetaImpl.js";
import {BlobSniffer, Stench} from "../BlobSniffer.js";
import {lsb, msb} from "../core.js";
import {LittleEndian} from "../Endian.js";
import {FileBlob} from "../FileBlob.js";
import {LogicalLine} from "../LogicalLine.js";
import {Memory} from "../Memory.js";
import {MemoryConfiguration} from "../MemoryConfiguration.js";
import {Tag} from "../Tag.js";
import {CBM_BASIC_2_0} from "./BasicDecoder.js";

/**
 * Detects Commodore BASIC program formats.
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
      hashTags: string[] = ["basic", "cbm", memoryConfig.shortName]
  ) {
    this.memoryConfig = memoryConfig;
    this.name = name;
    this.desc = desc;
    this.hashTags = hashTags;
  }

  getMeta(): DisassemblyMeta {
    return DisassemblyMetaImpl.NULL_DISSASSEMBLY_META;
  }

  getMemoryConfig(): MemoryConfiguration {
    return this.memoryConfig;
  }

  sniff(fb: FileBlob): Stench {
    // check if the start address bytes match the basic load address for our MemoryConfiguration
    const byte0Match = fb.getBytes()[0] === lsb(this.memoryConfig.basicProgramStart);
    const byte1Match = fb.getBytes()[1] === msb(this.memoryConfig.basicProgramStart);
    let isBasic = (byte0Match && byte1Match) ? 1.2 : 0.8; // score for matching or not
    const messages: string[] = [];
    // try decoding it as basic
    try {
      // TODO need to be able to dynamically interpret a FileBlob as LittleEndian
      //   in order to read the bytes for VIC - if the shoe fits...
      const decoded = CBM_BASIC_2_0.decode(fb.asMemory() as Memory<LittleEndian>);
      let lastNum = -1;
      const lastAddr = -1;
      let byteCount = 0;
      decoded.getLines().forEach((ll: LogicalLine) => {
        const i: Tag[] = ll.getTags();
        // BasicDecoder puts this tag on lines1
        const lnumStr = i.find(t => t.isLineNumber());
        const addrStr = i.find(t => t.isAddress());
        if (lnumStr !== undefined && addrStr !== undefined) {
          const thisNum = parseInt(lnumStr.value);
          if (lastNum !== -1 && lastNum >= thisNum) {
            // decrease in basic line numbers
            messages.push(`decrease in basic line numbers for ${fb.name}`)
            isBasic *= 0.5;
          }
          if (lastAddr !== -1 && lastAddr >= parseInt(addrStr.value, 16)) {
            // next line address is allegedly lower? This ain't basic
            messages.push(`lower next line address for ${fb.name} after line at address ${lastAddr}`)
            isBasic *= 0.3;
          }
          lastNum = thisNum;
          byteCount += ll.getByteSize();
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
            console.log(`basic decoder: basicSize ${basicSize} remainingSize: ${remainingSize}`);
          }
        }
      });
    } catch (_e) {
      // if we exploded, it's not BASIC!
      //console.error(e);
      isBasic = 0.01;
    }
    return {score: isBasic, messages: messages};
  }
}

export {CbmBasicSniffer};