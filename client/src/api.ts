import {Detail} from "@common/Detail.ts";
import {BlobSniffer} from "@common/machine/BlobSniffer.ts";
import {FileBlob} from "@common/machine/FileBlob.ts";

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
 * Holds the sniffer and the set of actions that can be taken for this sniffer. At least one action required.
 */
type SnifferWithActions = { bs: BlobSniffer, actions: [UserAction, ...UserAction[]] };

/**
 * Encapsulation of the function for determining the set of actions that can be taken
 * given knowledge of the sniffer and contents of a file.
 */
type ActionFunction = (bs: BlobSniffer, fb: FileBlob) => SnifferWithActions;

/** Function that produces TypeActions with only a {@link FileBlob}. */
type BlobToActions = (fileBlob: FileBlob) => SnifferWithActions;

export type {
  ActionExecutor,
  ActionFunction,
  BlobToActions,
  Continuation,
  SnifferWithActions,
  UserAction,
  UserFileAction
};