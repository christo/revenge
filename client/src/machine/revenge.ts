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
  VIC20_CART_SNIFFER,
  VIC_CART_ADDRS
} from "./cbm/vic20.ts";
import {snifVic20McWithBasicStub} from "./cbm/Vic20StubSniffer.ts";
import {FileBlob} from "./FileBlob.ts";


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
 * TODO should return a top list with confidence scores
 *
 * @param fileBlob
 */
const runSniffers = (fileBlob: FileBlob): TypeActions => {
  // run through various detection matchers which return a match coefficient
  // we look for a good match in order to decide what TypeActions to give the user,
  // falling through to unknown which can only hexdump.
  // hexdump is always an option

  // TODO C64 CRT file format sniffer

  const cartSniffers = [VIC20_CART_SNIFFER, C64_8K16K_CART_SNIFFER];
  const cartMatch = cartSniffers.find(c => c.sniff(fileBlob) > 1);
  if (cartMatch) {
    return mkDisasmAction(cartMatch, fileBlob);
  }

  const hd = hexDumper(fileBlob);
  if (C64_CRT.sniff(fileBlob) > 1) {
    const typeActions = crt64Actions(fileBlob);
    typeActions.actions.push(hd);
    // TODO get rid of early return
    return typeActions;
  }

  let maxBasicSmell = 0;
  for (let i = 0; i < BASIC_SNIFFERS.length; i++) {
    const basicSmell = BASIC_SNIFFERS[i].sniff(fileBlob);
    maxBasicSmell = Math.max(maxBasicSmell, basicSmell);
    if (basicSmell > 1) {
      const ta = printBasic(BASIC_SNIFFERS[i], fileBlob);
      ta.actions.push(hd);
      // TODO get rid of early return
      return ta;
    }
  }

  // common cartridge image load addresses

  const someSniffers = VIC_CART_ADDRS;

  bestSniffer(someSniffers, fileBlob);

  for (let i = 0; i < VIC_CART_ADDRS.length; i++) {
    const prg = VIC_CART_ADDRS[i];
    // currently returns the first one that scores above 1
    if (prg.sniff(fileBlob) > 1) {
      console.log(`sniffed common prg blob type`);
      // TODO get rid of early return
      return mkDisasmAction(prg, fileBlob);
    }
  }
  // detect VIC20 machine code with basic stub
  // we have already detected some basicness
  if (maxBasicSmell > 0.5) {
    // TODO finish this idea, maybe take sniffer with max score?
    /*
    Vic20.MEMORY_CONFIGS
        .map(mc => new Vic20StubSniffer(mc)
        .sniff(fileBlob))
        .reduce(sniff => {

    }, 0)
    */
    const ta: TypeActions = snifVic20McWithBasicStub(fileBlob);
    return ta;
  }
  // resort to hex dump only
  return {t: UNKNOWN_BLOB, actions: [hd]};
}


export {runSniffers};