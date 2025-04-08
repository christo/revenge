// application-level stuff to tie user interface and domain model

import {hexDumper, TypeActions} from "./api.ts";
import {BlobSniffer} from "./BlobSniffer.ts";
import {UNKNOWN_TYPE} from "./BlobTypeSniffer.ts";
import {C64_8K16K_CART_SNIFFER, C64_BASIC_PRG, C64_CRT, crt64Actions} from "./cbm/c64.ts";
import {disasmAction, printBasic} from "./cbm/cbm.ts";
import {
  EXP03K_VIC_BASIC,
  EXP08K_VIC_BASIC,
  EXP16K_VIC_BASIC,
  EXP24K_VIC_BASIC,
  POPULAR_CART_LOAD_ADDRS,
  UNEXPANDED_VIC_BASIC, Vic20,
  VIC20_CART_SNIFFER, Vic20BasicSniffer
} from "./cbm/vic20.ts";
import {FileBlob} from "./FileBlob.ts";
import {
  snifVic20McWithBasicStub,
  Vic20StubSniffer
} from "./cbm/Vic20StubSniffer.ts";


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
const sniff = (fileBlob: FileBlob): TypeActions => {
  // run through various detection matchers, falling through to unknown
  // TODO CRT file format sniffer
  const carts = [VIC20_CART_SNIFFER, C64_8K16K_CART_SNIFFER];
  for (let i = 0; i < carts.length; i++) {
    const cart = carts[i];
    if (cart.sniff(fileBlob) > 1) {
      // TODO get rid of early return
      return disasmAction(cart, fileBlob);
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
  for (let i = 0; i < POPULAR_CART_LOAD_ADDRS.length; i++) {
    const prg = POPULAR_CART_LOAD_ADDRS[i];
    if (prg.sniff(fileBlob) > 1) {
      console.log(`sniffed common prg blob type`);
      // TODO get rid of early return
      return disasmAction(prg, fileBlob);
    }
  }
  // detect VIC20 machine code with basic stub
  // we have already detected some basicness
  if (maxBasicSmell > 0.5) {
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
  const typeActions: TypeActions = {t: UNKNOWN_TYPE, actions: [hd]};
  return typeActions;
}


export {sniff};