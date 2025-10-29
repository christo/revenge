// application-level stuff to tie user interface and domain model

import {DataViewImpl} from "@common/DataView.ts";
import {Detail} from "@common/Detail.ts";
import {Environment} from "@common/machine/asm/asm.ts";
import {RevengeDialect} from "@common/machine/asm/RevengeDialect.ts";
import {bestSniffer, BlobSniffer, UNKNOWN_BLOB} from "@common/machine/BlobSniffer.ts";
import {CBM_BASIC_2_0} from "@common/machine/cbm/BasicDecoder.ts";
import {C64_8K16K_CART_SNIFFER, C64_BASIC_PRG, C64_CRT} from "@common/machine/cbm/c64.ts";
import {C64StubSniffer} from "@common/machine/cbm/C64StubSniffer.ts";
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
import {HexDumpDetailConfig} from "@common/machine/HexDumpDetailConfig.ts";
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
    return new Detail("Hex Dump", [TAG_HEXBYTES], new DataViewImpl(lls), new HexDumpDetailConfig());
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

/** Prints the all bytes in the file interpreted as a BASIC program. */
const printBasic: ActionFunction = (t: BlobSniffer, fb: FileBlob) => {
  return {
    t: t,
    actions: [{
      label: "basic",
      f: async () => {
        const cbmFb: Memory<LittleEndian> = fb.asMemory() as Memory<LittleEndian>;

        try {
          // TODO make CbmBasicDetailConfig class
          const detail = new Detail("CBM Basic", ["basic"], CBM_BASIC_2_0.decode(cbmFb), undefined);
          detail.stats.push(["lines", detail.dataView.getLines().filter(LogicalLine.JUST_LINES).length.toString()]);
          return detail;
        } catch (e) {
          // TODO figure out how to handle this, we detected basic but couldn't decode it
          //  malformed basic programs seem to exist and still work (e.g. gamepack.prg)
          throw Error(`failure to decode basic: ${e}`);
        }

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

  const hd = mkHexDumper(fileBlob);

  const ALL_BASIC_SNIFFERS: BlobSniffer[] = [
    ...VIC20_BASIC_SNIFFERS,
    C64_BASIC_PRG
  ];

  const DISASM_SNIFFERS: BlobSniffer[] = [
    VIC20_CART_SNIFFER,
    C64_8K16K_CART_SNIFFER,
    ...VIC_PRG_SNIFFERS_AT_CART_BASES,
    ...Vic20.MEMORY_CONFIGS.map(mc => new Vic20StubSniffer(mc)),
    new C64StubSniffer()
  ];

  const bestBasicSniffer = bestSniffer(ALL_BASIC_SNIFFERS, fileBlob);
  const bestDisasmSniffer = bestSniffer(DISASM_SNIFFERS, fileBlob);

  const basicStench = bestBasicSniffer.sniff(fileBlob);
  const disasmStench = bestDisasmSniffer.sniff(fileBlob);

  // choose the best of disasm or basic
  if (basicStench.score > disasmStench.score && basicStench.score > 1) {
    const ta = printBasic(bestBasicSniffer, fileBlob);
    ta.actions.push(hd);
    // TODO get rid of early return
    return ta;
  } else if (disasmStench.score > 1) {
    const tas = mkDisasmAction(bestDisasmSniffer, fileBlob);
    tas.actions.push(hd);
    return tas;
  }

  if (C64_CRT.sniff(fileBlob).score > 1) {
    const tas: TypeActions = ({t: C64_CRT, actions: [hd]});
    console.warn("temporarily resorting to hexdump for C64_CRT");
    return tas;
  }

  // resort to hex dump only
  return {t: UNKNOWN_BLOB, actions: [hd]};
}

export {runSniffers};