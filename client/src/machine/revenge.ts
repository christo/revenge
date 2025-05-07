// application-level stuff to tie user interface and domain model

import {hexDumper, TypeActions} from "./api.ts";
import {bestSniffer, BlobSniffer, UNKNOWN_BLOB} from "./BlobSniffer.ts";
import {C64_8K16K_CART_SNIFFER, C64_BASIC_PRG, C64_CRT, crt64Actions} from "./cbm/c64.ts";
import {mkDisasmAction, printBasic} from "./cbm/cbm.ts";
import {
  EXP03K_VIC_BASIC,
  EXP08K_VIC_BASIC,
  EXP16K_VIC_BASIC,
  EXP24K_VIC_BASIC,
  UNEXPANDED_VIC_BASIC,
  Vic20,
  VIC20_CART_SNIFFER,
  VIC_CART_ADDRS
} from "./cbm/vic20.ts";
import {Vic20StubSniffer} from "./cbm/Vic20StubSniffer.ts";
import {FileBlob} from "../../../server/src/common/machine/FileBlob.ts";


// Make these decode the basic and do a few sanity checks, e.g. monotonic unique line numbers
const BASIC_SNIFFERS: BlobSniffer[] = [
  UNEXPANDED_VIC_BASIC,
  EXP03K_VIC_BASIC,
  EXP08K_VIC_BASIC,
  EXP16K_VIC_BASIC,
  EXP24K_VIC_BASIC,
  C64_BASIC_PRG,
];

/**
 * Returns a best-guess file type and user actions that can be done on it.
 *
 * @param fileBlob
 */
const runSniffers = (fileBlob: FileBlob): TypeActions => {
  if (fileBlob.getLength() === 0) {
    throw Error(`empty fileblob ${fileBlob.name}`);
  }
  // run through various detection matchers which return a match coefficient;
  // we look for a good match to decide what TypeActions to give the user,
  // falling through to unknown which can only hexdump.
  // hexdump is always an option

  // TODO C64 CRT file format sniffer

  const cartSniffers = [VIC20_CART_SNIFFER, C64_8K16K_CART_SNIFFER];
  const cartMatch = cartSniffers.find(c => c.sniff(fileBlob).score > 1);
  if (cartMatch) {
    return mkDisasmAction(cartMatch, fileBlob);
  }

  const hd = hexDumper(fileBlob);
  if (C64_CRT.sniff(fileBlob).score > 1) {
    const typeActions = crt64Actions(fileBlob);
    typeActions.actions.push(hd);
    // TODO get rid of early return
    return typeActions;
  }

  let maxBasicSmell = 0;
  for (let i = 0; i < BASIC_SNIFFERS.length; i++) {
    const basicSmell = BASIC_SNIFFERS[i].sniff(fileBlob);
    maxBasicSmell = Math.max(maxBasicSmell, basicSmell.score);
    if (basicSmell.score > 1) {
      const ta = printBasic(BASIC_SNIFFERS[i], fileBlob);
      ta.actions.push(hd);
      // TODO get rid of early return
      return ta;
    }
  }

  // common cartridge image load addresses

  for (let i = 0; i < VIC_CART_ADDRS.length; i++) {
    const prg = VIC_CART_ADDRS[i];
    // currently returns the first one that scores above 1
    if (prg.sniff(fileBlob).score > 1) {
      console.log(`sniffed common prg blob type`);
      // TODO get rid of early return
      return mkDisasmAction(prg, fileBlob);
    }
  }
  // detect VIC20 machine code with basic stub
  // we have already detected some basicness
  if (maxBasicSmell > 0.5) {
    // figure out which memory config to use
    const memoryconfigs = Vic20.MEMORY_CONFIGS.map(mc => new Vic20StubSniffer(mc));
    const stubSniff = bestSniffer(memoryconfigs, fileBlob);
    // TODO ideally we wouldn't sniff again
    if (stubSniff.sniff(fileBlob).score > 1) {
      // TODO disassembly missing basic stub edicts
      return mkDisasmAction(stubSniff, fileBlob);
    }
  }
  // resort to hex dump only
  return {t: UNKNOWN_BLOB, actions: [hd]};
}


export {runSniffers};