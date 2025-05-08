import {DataViewImpl} from "../../server/src/common/DataView.ts";
import {Detail} from "../../server/src/common/Detail.ts";
import {hex8} from "../../server/src/common/machine/core.ts";
import {FileBlob} from "../../server/src/common/machine/FileBlob.ts";
import {LogicalLine} from "../../server/src/common/machine/LogicalLine.ts";
import {HexTag, Tag, TAG_HEXBYTES} from "../../server/src/common/machine/Tag.ts";
import {UserFileAction} from "./api.ts";

/**
 * Shows a hex dump for a {@link FileBlob}.
 * @param fb
 */
const hexDumper: UserFileAction = (fb: FileBlob) => ({
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
export {hexDumper};