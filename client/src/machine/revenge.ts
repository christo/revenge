// application-level stuff to tie user interface and domain model

import {hexDumper, TypeActions} from "./api.ts";
import {LabelsComments, SymbolTable} from "./asm/asm.ts";
import {DisassemblyMeta} from "./asm/DisassemblyMeta.ts";
import {Edict} from "./asm/Edict.ts";
import {InstructionLike} from "./asm/instructions.ts";
import {BlobTypeSniffer, UNKNOWN_BLOB} from "./BlobTypeSniffer.ts";
import {TOKEN_SPACE, TOKEN_SYS} from "./cbm/BasicDecoder.ts";
import {C64_8K_CART, C64_BASIC_PRG, C64_CRT, crt64Actions} from "./cbm/c64.ts";
import {disassemble, prg, printBasic} from "./cbm/cbm.ts";
import {Petscii} from "./cbm/petscii.ts";
import {
  POPULAR_CART_LOAD_ADDRS,
  EXP03K_VIC_BASIC,
  EXP08K_VIC_BASIC,
  EXP16K_VIC_BASIC,
  EXP24K_VIC_BASIC,
  UNEXPANDED_VIC_BASIC, Vic20,
  VIC20_CART, VIC20_KERNAL
} from "./cbm/vic20.ts";
import {Addr, asHex, hex16} from "./core.ts";
import {FileBlob} from "./FileBlob.ts";
import {Mos6502} from "./mos6502.ts";

function renderAddrDecHex(addr: Addr) {
  return `${addr} ($${hex16(addr)})`
}

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
    // TODO move this hairball into a sniffer
    const loadAddress = fileBlob.read16(0);
    const memoryConfig = Vic20.MEMORY_CONFIGS.find(mc => mc.basicProgramStart === loadAddress);
    // TODO tighten up this rough heuristic
    if (fileBlob.getLength() > 20 && memoryConfig) {
      console.log("basic load address but probably only a sys call to machine code");
      // we probably have a basic header with machine code following
      // we need to decode the basic header, read a sys command and
      // calculate the entry point
      // sys token index =
      // load address length: 2 +
      // next line address length: 2 +
      // line number length: 2 =
      // 6
      if (fileBlob.read8(6) === TOKEN_SYS) {
        let i= 7;
        // skip any spaces
        while (fileBlob.read8(i) === TOKEN_SPACE) {
          i++;
        }
        // read petscii decimal address until space or end of line
        let intString = "";
        let byteRead = fileBlob.read8(i);
        while (i < fileBlob.getLength() && Petscii.C64.unicode[byteRead] >= '0' && Petscii.C64.unicode[byteRead] <= '9') {
          intString += Petscii.C64.unicode[byteRead];
          byteRead = fileBlob.read8(++i);
        }
        // console.log(`intString is ${intString}`);
        try {
          const startAddress = parseInt(intString, 10);
          if (isNaN(startAddress)) {
            throw Error(`could not parse start address "${intString}"`)
          }

          const CONTENT_OFFSET = 2; // header contains just the 16 bit load address
          const sysCall = `SYS ${startAddress}`
          // TODO tidy this up
          const entryPointDesc = `BASIC loader stub ${sysCall}`;
          const dm: DisassemblyMeta = {
            baseAddress(_fb: FileBlob): number {
              return memoryConfig.basicProgramStart;
            }, contentStartOffset(): number {
              return 2;
            }, executionEntryPoints(_fb: FileBlob): [number, string][] {
              return [[startAddress, entryPointDesc]];
            }, getEdict(_offset: number): Edict<InstructionLike> | undefined {
              // TODO make edict(?) about basic header definition
              return undefined;
            }, getSymbolTable(): SymbolTable {
              return VIC20_KERNAL;
            }, isInBinary(addr: number, fb: FileBlob): boolean {
              return addr > memoryConfig.basicProgramStart && addr < (fb.getLength() - CONTENT_OFFSET);
            }, resolveSymbols(_fb: FileBlob): [number, LabelsComments][] {
              return [[startAddress, new LabelsComments("entry", `called from BASIC with ${sysCall}`)]];
            }

          }
          const desc = `${Vic20.NAME} ${memoryConfig.shortName} program binary loaded at ${renderAddrDecHex(memoryConfig.basicProgramStart)}, entry point $${hex16(startAddress)} via ${entryPointDesc}`;
          const prefixWtf = [startAddress && 0x00ff, startAddress >> 2];
          const basicPrefixType = new BlobTypeSniffer(`${Mos6502.NAME} Machine Code`, desc, ["prg"], "prg", prefixWtf, dm);
          return disassemble(basicPrefixType, fileBlob);
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