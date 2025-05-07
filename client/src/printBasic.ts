import {Detail} from "../../server/src/common/Detail.ts";
import {BlobSniffer} from "../../server/src/common/machine/BlobSniffer.ts";
import {CBM_BASIC_2_0} from "../../server/src/common/machine/cbm/BasicDecoder.ts";
import {LittleEndian} from "../../server/src/common/machine/Endian.ts";
import {FileBlob} from "../../server/src/common/machine/FileBlob.ts";
import {LogicalLine} from "../../server/src/common/machine/LogicalLine.ts";
import {Memory} from "../../server/src/common/machine/Memory.ts";
import {Tag} from "../../server/src/common/machine/Tag.ts";
import {ActionFunction} from "./machine/api.ts";

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
export {printBasic};