import {hexDumper, MemoryConfiguration, TypeActions} from "../api.ts";
import {DisassemblyMeta} from "../asm/DisassemblyMeta.ts";
import {DisassemblyMetaImpl} from "../asm/DisassemblyMetaImpl.ts";
import {BlobSniffer, UNKNOWN_BLOB} from "../BlobSniffer.ts";
import {BlobTypeSniffer} from "../BlobTypeSniffer.ts";
import {Addr, asHex, hex16} from "../core.ts";
import {LE} from "../Endian.ts";
import {FileBlob} from "../FileBlob.ts";
import {Mos6502} from "../mos6502.ts";
import {TOKEN_SPACE, TOKEN_SYS} from "./BasicDecoder.ts";
import {BasicStubDisassemblyMeta} from "./BasicStubDisassemblyMeta.ts";
import {mkDisasmAction, prg} from "./cbm.ts";
import {Petscii} from "./petscii.ts";
import {Vic20, VIC20_SYM, Vic20BasicSniffer} from "./vic20.ts";

function renderAddrDecHex(addr: Addr) {
  return `${addr} ($${hex16(addr)})`
}


/**
 * Temporary function that combines sniffer and its calling code
 * @param fileBlob
 * @deprecated migrate to just use the sniffer
 */
function snifVic20McWithBasicStub(fileBlob: FileBlob): TypeActions {
  const loadAddress = fileBlob.read16(0);
  // TODO we only find the first memory config with the correct start address, we should
  //  possibly use the largest one that matches the layout with the correct start address
  //  i.e. unexpanded, 3kb, 24kb
  const memoryConfig = Vic20.MEMORY_CONFIGS.find(mc => mc.basicProgramStart === loadAddress);
  // try to decode just the stub in order to determine the machine code entry point
  // TODO tighten up this rough heuristic
  if (fileBlob.getLength() > 20 && memoryConfig) {
    //console.log("got basic load address, checking simple sys call to machine code");
    // we probably have a basic header with machine code following
    // we need to decode the basic header, read a sys command and
    // calculate the entry point
    // sys token index =
    // load address length: 2 +
    // next line address length: 2 +
    // line number length: 2 =
    // 6
    // hacky peek to find a sys token which might reveal the petscii decimal address
    // this is just a guess that is often correct, however there could be parentheses, preamble code etc.
    if (fileBlob.read8(6) === TOKEN_SYS) {
      let i = 7;
      // skip any spaces
      while (fileBlob.read8(i) === TOKEN_SPACE) {
        i++;
      }
      // read decimal address
      const intString = Petscii.readDigits(fileBlob.asEndian(), i);
      if (intString.length > 0) {
        try {
          const startAddress = parseInt(intString, 10);
          if (!isNaN(startAddress)) {


            const addrDesc = renderAddrDecHex(memoryConfig.basicProgramStart);
            const systemDesc = `${Vic20.NAME} (${memoryConfig.shortName})`;
            const entryPointDesc = `BASIC stub SYS ${startAddress}`;
            const extraDesc = `entry point $${hex16(startAddress)} via ${entryPointDesc}`;
            const desc = `${systemDesc} program loaded at ${addrDesc}, ${extraDesc}`;

            const loadAddressBytes = LE.wordToTwoBytes(startAddress);
            const dm: DisassemblyMeta = new BasicStubDisassemblyMeta(memoryConfig, VIC20_SYM, startAddress, entryPointDesc)

            const hashTags = ["prg", "vic20", memoryConfig.shortName];
            const sniffer = new BlobTypeSniffer(`${Mos6502.NAME} Machine Code`, desc, hashTags, "prg", loadAddressBytes, dm);
            return mkDisasmAction(sniffer, fileBlob);
          } else {
            console.warn(`sys argument couldn't be parsed as an integer: "${intString}"`);
          }
        } catch (e) {
          console.error("died trying to disassemble during sniff", e);
        }
      } else {
        console.warn(`couldn't find sys command argument`);
      }
    } else {
      const b = fileBlob.getBytes().slice(0, 20);
      console.log(b);
      const hex = asHex(b);
      console.warn(`basic header didn't start with sys command\n${hex}`);
    }

    return {t: UNKNOWN_BLOB, actions: [hexDumper(fileBlob)]}
  }
  console.log(`detecting prg at ${hex16(fileBlob.read16(0))}`);
  return mkDisasmAction(prg([fileBlob.read8(1), fileBlob.read8(0)]), fileBlob);
}

/**
 * Hybrid sniffer of a machine code program with a basic stub.
 * Since some different memory configurations require different load addresses,
 * these can be distinguished just like pure BASIC prg files, however not all
 * memory configuration requirements are evident from the load address. A
 * trace or simulation could give good approximation here.
 */
class Vic20StubSniffer extends Vic20BasicSniffer implements BlobSniffer {

  constructor(memory: MemoryConfiguration) {
    super(memory,
        `6502 Machine Code with BASIC stub`,
        `6502 Machine Code with BASIC stub(${memory.shortName})`,
        ["basic", "machine-code", "vic20", memory.shortName]);
  }

  sniff(fb: FileBlob): number {
    // how much like BASIC does this seem?
    const basicSmell = super.sniff(fb);
    // TODO WIP finish this implementation and move snifVic20McWithBasicStub(fb) in here
    const typeActions = snifVic20McWithBasicStub(fb);
    return basicSmell;
  }


  getMeta(): DisassemblyMeta {
    // TODO implement this using BasicStubDisassemblyMeta
    return DisassemblyMetaImpl.NULL_DISSASSEMBLY_META;
  }
}

export {Vic20StubSniffer, snifVic20McWithBasicStub};