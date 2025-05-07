import {Detail} from "../../../server/src/common/Detail.ts";
import {BlobSniffer} from "../../../server/src/common/machine/BlobSniffer.ts";
import {hex8} from "../../../server/src/common/machine/core.ts";
import {FileBlob} from "../../../server/src/common/machine/FileBlob.ts";
import {HexTag, Tag, TAG_HEXBYTES} from "../../../server/src/common/machine/Tag.ts";
import {DataView, DataViewImpl} from "../../../server/src/common/DataView.ts";
import {LogicalLine} from "../../../server/src/common/machine/LogicalLine.ts";

/*
main API types
 */


/**
 * Main function for generating the file detail.
 */
type ActionExecutor = () => Promise<Detail>;

/** A type for handling the result of a UserAction execution */
type Continuation = (fo: ActionExecutor) => void;

/** Holds the UI button label and function to call when the button is clicked */
type UserAction = { label: string, f: ActionExecutor };

/**
 * User action for a fileblob
 */
type UserFileAction = (fb: FileBlob) => UserAction;

/**
 * Holds the sniffer and the set of actions that can be taken for this type. At least one action required.
 */
type TypeActions = { t: BlobSniffer, actions: [UserAction, ...UserAction[]] };

/**
 * Encapsulation of the function for determining the set of actions that can be taken
 * given knowledge of the type and contents of a file.
 */
type ActionFunction = (t: BlobSniffer, fb: FileBlob) => TypeActions;

/** Function that produces TypeActions with only a {@link FileBlob}. */
type BlobToActions = (fileBlob: FileBlob) => TypeActions;

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
    const newDataView: DataView = new DataViewImpl(lls);
    return new Detail("Hex Dump", [TAG_HEXBYTES], newDataView);
  }
});

export {hexDumper};
export type {
  ActionExecutor,
  ActionFunction,
  BlobToActions,
  Continuation,
  TypeActions,
  UserAction,
  UserFileAction
};