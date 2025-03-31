// application-level stuff to tie user interface and domain model

import {hexDumper, TypeActions} from "./api.ts";
import {DisassemblyMeta} from "./asm/DisassemblyMeta.ts";
import {BlobTypeSniffer, UNKNOWN_BLOB} from "./BlobTypeSniffer.ts";
import {TOKEN_SPACE, TOKEN_SYS} from "./cbm/BasicDecoder.ts";
import {BasicStubDisassemblyMeta} from "./cbm/BasicStubDisassemblyMeta.ts";
import {C64_8K_CART, C64_BASIC_PRG, C64_CRT, crt64Actions} from "./cbm/c64.ts";
import {disassemble, prg, printBasic} from "./cbm/cbm.ts";
import {Petscii} from "./cbm/petscii.ts";
import {
  EXP03K_VIC_BASIC,
  EXP08K_VIC_BASIC,
  EXP16K_VIC_BASIC,
  EXP24K_VIC_BASIC,
  POPULAR_CART_LOAD_ADDRS,
  UNEXPANDED_VIC_BASIC,
  Vic20,
  VIC20_CART_SNIFFER,
  VIC20_KERNAL
} from "./cbm/vic20.ts";
import {Addr, asHex, hex16} from "./core.ts";
import {FileBlob} from "./FileBlob.ts";
import {Mos6502} from "./mos6502.ts";

function renderAddrDecHex(addr: Addr) {
  return `${addr} ($${hex16(addr)})`
}

/**
 * Reads integer characters at the offset
 * @param fileBlob
 * @param offset
 */
function readPetsciiInteger(fileBlob: FileBlob, offset: number) {
  let intString = "";
  let i = offset;
  let byteRead = fileBlob.read8(i);
  while (i < fileBlob.getLength() && Petscii.C64.unicode[byteRead] >= '0' && Petscii.C64.unicode[byteRead] <= '9') {
    intString += Petscii.C64.unicode[byteRead];
    byteRead = fileBlob.read8(++i);
  }
  return intString;
}

/**
 * Returns a best-guess file type and user actions that can be done on it.
 *
 * @param fileBlob
 */
const sniff = (fileBlob: FileBlob): TypeActions => {
  // run through various detection matchers, falling through to unknown
  const carts = [VIC20_CART_SNIFFER, C64_8K_CART];
  for (let i = 0; i < carts.length; i++) {
    const cart = carts[i];
    if (cart.sniff(fileBlob) > 1) {
      // TODO get rid of early return
      return disassemble(cart, fileBlob);
    }
  }
  const hd = hexDumper(fileBlob);
  if (C64_CRT.sniff(fileBlob) > 1) {
    const typeActions = crt64Actions(fileBlob);
    typeActions.actions.push(hd);
    // TODO get rid of early return
    return typeActions;
  }

  let maxBasicSmell = 0;
  for (let i = 0; i < BASICS.length; i++) {
    const basicSmell = BASICS[i].sniff(fileBlob);
    maxBasicSmell = Math.max(maxBasicSmell, basicSmell);
    if (basicSmell > 1) {
      const ta = printBasic(BASICS[i], fileBlob);
      ta.actions.push(hd);
      // TODO get rid of early return
      return ta;
    }
  }

  // common cartridge image load addresses
  for (let i = 0; i < POPULAR_CART_LOAD_ADDRS.length; i++) {
    const prg = POPULAR_CART_LOAD_ADDRS[i];
    if (prg.sniff(fileBlob) > 1) {
      console.log(`sniffed common prg blob type`);
      // TODO get rid of early return
      return disassemble(prg, fileBlob);
    }
  }
  // detect VIC20 machine code with basic stub
  if (maxBasicSmell > 0.5) {
    const loadAddress = fileBlob.read16(0);
    const memoryConfig = Vic20.MEMORY_CONFIGS.find(mc => mc.basicProgramStart === loadAddress);
    // TODO tighten up this rough heuristic
    if (fileBlob.getLength() > 20 && memoryConfig) {
      console.log("got basic load address, checking simple sys call to machine code");
      // we probably have a basic header with machine code following
      // we need to decode the basic header, read a sys command and
      // calculate the entry point
      // sys token index =
      // load address length: 2 +
      // next line address length: 2 +
      // line number length: 2 =
      // 6
      if (fileBlob.read8(6) === TOKEN_SYS) {
        let i = 7;
        // skip any spaces
        while (fileBlob.read8(i) === TOKEN_SPACE) {
          i++;
        }
        // read petscii decimal address until space or end of line
        let intString = readPetsciiInteger(fileBlob, i);
        try {
          const startAddress = parseInt(intString, 10);
          if (isNaN(startAddress)) {
            throw Error(`could not parse start address "${intString}"`)
          }

          const sysCall = `SYS ${startAddress}`
          const entryPointDesc = `BASIC loader stub ${sysCall}`;
          const dm: DisassemblyMeta = new BasicStubDisassemblyMeta(memoryConfig, VIC20_KERNAL, startAddress, entryPointDesc)
          const addrDesc = renderAddrDecHex(memoryConfig.basicProgramStart);
          const systemDesc = `${Vic20.NAME} (${memoryConfig.shortName})`;
          const extraDesc = `entry point $${hex16(startAddress)} via ${entryPointDesc}`;
          const desc = `${systemDesc} program loaded at ${addrDesc}, ${extraDesc}`;
          const prefixWtf = [startAddress && 0x00ff, startAddress >> 2];
          const sniffer = new BlobTypeSniffer(`${Mos6502.NAME} Machine Code`, desc, ["prg"], "prg", prefixWtf, dm);
          return disassemble(sniffer, fileBlob);
        } catch (e) {
          console.error("died trying to parse sys arg", e);
        }
      } else {
        const b = fileBlob.getBytes().slice(0, 20);
        console.log(b);
        const hex = asHex(b);
        console.warn(`basic header didn't start with sys command\n${hex}`);
      }
      return {t: UNKNOWN_BLOB, actions: [hd]}
    }
    console.log(`detecting prg at ${hex16(fileBlob.read16(0))}`);
    return disassemble(prg([fileBlob.read8(1), fileBlob.read8(0)]), fileBlob);
  }
  return {t: UNKNOWN_BLOB, actions: [hd]};
}

// Make these decode the basic and do a few sanity checks, e.g. monotonic unique line numbers
const BASICS = [
  UNEXPANDED_VIC_BASIC,
  EXP03K_VIC_BASIC,
  EXP08K_VIC_BASIC,
  EXP16K_VIC_BASIC,
  EXP24K_VIC_BASIC,
  C64_BASIC_PRG,
]

export {sniff};