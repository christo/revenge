// application-level stuff to tie user interface and domain model

import {hexDumper, TypeActions} from "./api";
import {UNKNOWN_BLOB} from "./asm";
import {C64_8K_CART, C64_BASIC_PRG, C64_CRT, crt64Actions} from "./c64";
import {disassemble, printBasic} from "./cbm";
import {FileBlob} from "./FileBlob";
import {
    COMMON_MLPS,
    EXP03K_VIC_BASIC,
    EXP08K_VIC_BASIC,
    EXP16K_VIC_BASIC,
    EXP24K_VIC_BASIC,
    UNEXPANDED_VIC_BASIC,
    VIC20_CART
} from "./vic20";

/**
 * Returns a best-guess file type and user actions that can be done on it.
 *
 * @param fileBlob
 */
const sniff = (fileBlob: FileBlob): TypeActions => {
  // run through various detection matchers, falling through to unknown
  const carts = [VIC20_CART, C64_8K_CART];
  for (let i = 0; i < carts.length; i++) {
    const cart = carts[i];
    if (cart.sniff(fileBlob) > 1) {
      return disassemble(cart, fileBlob);
    }
  }
  const hd = hexDumper(fileBlob);
  if (C64_CRT.sniff(fileBlob) > 1) {
    const typeActions = crt64Actions(fileBlob);
    typeActions.actions.push(hd);
    return typeActions;
  }

  for (let i = 0; i < BASICS.length; i++) {
    const basicSmell = BASICS[i].sniff(fileBlob);
    if (basicSmell > 1) {
      const ta = printBasic(BASICS[i], fileBlob);
      ta.actions.push(hd);
      return ta;
    }
  }

  // common cartridge prg loads
  for (let i = 0; i < COMMON_MLPS.length; i++) {
    const prg = COMMON_MLPS[i];
    if (prg.sniff(fileBlob) > 1) {
      return disassemble(prg, fileBlob);
    }
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