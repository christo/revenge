// application-level stuff to tie user interface and domain model

import {DataViewImpl} from "@common/DataView.ts";
import {Detail} from "@common/Detail.ts";
import {Environment} from "@common/machine/asm/asm.ts";
import {RevengeDialect} from "@common/machine/asm/RevengeDialect.ts";
import {bestSniffer, BlobSniffer, UNKNOWN_BLOB} from "@common/machine/BlobSniffer.ts";
import {CBM_BASIC_2_0} from "@common/machine/cbm/BasicDecoder.ts";
import {C64_8K16K_CART_SNIFFER, C64_CRT} from "@common/machine/cbm/c64.ts";
import {
  Vic20,
  VIC20_BASIC_SNIFFERS,
  VIC20_CART_SNIFFER,
  VIC_PRG_SNIFFERS_AT_CART_BASES
} from "@common/machine/cbm/vic20.ts";
import {Vic20StubSniffer} from "@common/machine/cbm/Vic20StubSniffer.ts";
import {hex8} from "@common/machine/core.ts";
import {disassembleActual} from "@common/machine/dynamicAnalysis.ts";
import {LittleEndian} from "@common/machine/Endian.ts";
import {FileBlob} from "@common/machine/FileBlob.ts";
import {LogicalLine} from "@common/machine/LogicalLine.ts";
import {Memory} from "@common/machine/Memory.ts";
import {HexTag, Tag, TAG_HEXBYTES} from "@common/machine/Tag.ts";
import {ActionFunction, TypeActions, UserAction, UserFileAction} from "./api.ts";


/**
 * Shows a hex dump for a {@link FileBlob}.
 * @param fb
 */
const mkHexDumper: UserFileAction = (fb: FileBlob) => ({
  label: "Hex Dump",
  f: async () => {
    // TODO make hex dump have n bytes per line with addresses at beginning of each;
    //  currently whole hex dump is a single logical line at no address with no instruction
    // add the classes for hex dump as a whole and for each byte
    const allData = fb.getBytes().map(x => new HexTag(hex8(x)));
    const lls = [allData].map((ts: Tag[], i: number) => new LogicalLine(ts, 1, i));
    return new Detail("Hex Dump", [TAG_HEXBYTES], new DataViewImpl(lls));
  }
});


/**
 * User action that disassembles the file.
 */
function mkDisasmAction(t: BlobSniffer, fb: FileBlob): TypeActions {
  const dialect = new RevengeDialect(Environment.DEFAULT_ENV);  // to be made configurable later
  // type: array of at least one UserAction
  const userActions: [UserAction, ...UserAction[]] = [{
    label: "disassembly",
    f: async () => {
      return disassembleActual(fb, dialect, t.getMeta());
    }
  }];
  return {
    t: t,
    actions: userActions
  };
}

/** Prints the file as a BASIC program. */
const printBasic: ActionFunction = (t: BlobSniffer, fb: FileBlob) => {
  return {
    t: t,
    actions: [{
      label: "basic",
      f: async () => {
        const cbmFb: Memory<LittleEndian> = fb.asMemory() as Memory<LittleEndian>;
        const detail = new Detail("CBM Basic", ["basic"], CBM_BASIC_2_0.decode(cbmFb));
        // exclude "note" tags which are not a "line"
        const justLines = (ll: LogicalLine) => ll.getTags().find((t: Tag) => t.isLine()) !== undefined;
        detail.stats.push(["lines", detail.dataView.getLines().filter(justLines).length.toString()]);
        return detail;
      }
    }]
  };
};

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

  const hd = mkHexDumper(fileBlob);

  let maxBasicSmell = 0;
  for (let i = 0; i < VIC20_BASIC_SNIFFERS.length; i++) {
    const basicSmell = VIC20_BASIC_SNIFFERS[i].sniff(fileBlob);
    maxBasicSmell = Math.max(maxBasicSmell, basicSmell.score);
    if (basicSmell.score > 1) {
      const ta = printBasic(VIC20_BASIC_SNIFFERS[i], fileBlob);
      ta.actions.push(hd);
      // TODO get rid of early return
      return ta;
    }
  }


  const disassemblySniffers = [VIC20_CART_SNIFFER, C64_8K16K_CART_SNIFFER];
  const cartMatch = disassemblySniffers.find(c => c.sniff(fileBlob).score > 1);
  if (cartMatch) {
    const typeActions1 = mkDisasmAction(cartMatch, fileBlob);
    typeActions1.actions.push(hd);
    return typeActions1;
  }

  if (C64_CRT.sniff(fileBlob).score > 1) {
    const typeActions: TypeActions = ({t: C64_CRT, actions: [hd]});
    console.warn("temporarily resorting to hexdump for C64_CRT");
    return typeActions;
  }


  // common cartridge image load addresses

  for (let i = 0; i < VIC_PRG_SNIFFERS_AT_CART_BASES.length; i++) {
    const prg = VIC_PRG_SNIFFERS_AT_CART_BASES[i];
    // currently returns the first one that scores above 1
    const stench = prg.sniff(fileBlob);
    if (stench.score > 1) {
      console.log(`sniffed common prg blob type`);
      // TODO get rid of early return
      const tas = mkDisasmAction(prg, fileBlob);
      tas.actions.push(hd);
      return tas;
    }
  }
  // detect VIC20 machine code with basic stub
  // we have already detected some basicness
  // figure out which memory config to use
  const sniffers = Vic20.MEMORY_CONFIGS.map(mc => new Vic20StubSniffer(mc, ["vic20"]));
  const stubSniff = bestSniffer(sniffers, fileBlob);
  // TODO ideally we wouldn't sniff again
  const stench1 = stubSniff.sniff(fileBlob);
  if (stench1.score > 1) {
    // TODO disassembly missing basic stub edicts
    const typeActions3 = mkDisasmAction(stubSniff, fileBlob);
    typeActions3.actions.push(hd);
    return typeActions3;
  }
  // resort to hex dump only
  return {t: UNKNOWN_BLOB, actions: [hd]};
}


export {runSniffers};