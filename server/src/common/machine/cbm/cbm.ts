// Shared Commodore 8-bit machine stuff

import {BlobTypeSniffer} from "../BlobTypeSniffer.js";
import {hex8} from "../core.js";
import {Mos6502} from "../mos6502.js";
// import {EXP03K_VIC_BASIC, EXP08K_VIC_BASIC, EXP16K_VIC_BASIC, EXP24K_VIC_BASIC, UNEXPANDED_VIC_BASIC} from "./vic20.js";

const PROGRAM_EXTS = ["prg", "crt", "bin", "rom", "p00", "bas"];
const VOLUME_EXTS = ["d64", "tap", "t64", "d71", "d81"];
const MEDIA_EXTS = ["sid"];


/**
 * The expected file extensions for Commodore machines. May need to add more, but these seem initially sufficient
 */
const ALL_CBM_FILE_EXTS = [...PROGRAM_EXTS, ...VOLUME_EXTS, ...MEDIA_EXTS];


/**
 * Makes a BlobTypeSniffer representing a 6502 Commodore program binary file format with
 * the first two bytes of the load address in LSB,MSB format (little endian).
 *
 * @param prefix either an array of prefix bytes or a 16 bit word
 */
function prg(prefix: ArrayLike<number> | number) {
  // prg has a two byte load address
  const prefixPair = (typeof prefix === "number") ? Mos6502.ENDIANNESS.wordToTwoBytes(prefix) : prefix;
  const addr: string = `${hex8(prefixPair[1])}${hex8(prefixPair[0])}`; // little-endian rendition
  const desc = `program binary to load at $${addr}`;
  return new BlobTypeSniffer(`prg@${addr}`, desc, ["prg"], "prg", prefixPair);
}


export {prg, ALL_CBM_FILE_EXTS};
// Make these decode the basic and do a few sanity checks, e.g. monotonic unique line numbers
