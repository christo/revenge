// application-level stuff to tie user interface and domain model

import {FileBlob} from "./FileBlob";
import {BASIC_PRG, disassemble, printBasic} from "./cbm";
import {BlobSniffer, hexDumper, UNKNOWN} from "./asm";
import {C64_8K_CART, C64_CRT, crt64Actions} from "./c64";
import {COMMON_MLPS, VIC20_CART} from "./vic20";

/**
 * Representation of a generic view of data, a vertical sequence of horizontal string of kv pairs.
 * A generic displayable structure with a sequence of entries. Each entry is a sequence of
 * string tuples. The string tuple represents a name-value pair that will be rendered with
 * the name as a className and the value as the text content of a span element.
 */
type ActionResult = [string, string][][]; // 2d array of tuples

/**
 * Datastructure for all data interpretation output.
 */
class Detail {
    tags: string[];
    tfield: ActionResult;

    constructor(tags: string[], tfield: ActionResult) {
        this.tags = tags;
        this.tfield = tfield;
    }
}

type ActionExecutor = () => Detail;

/** A type for handling the result of a UserAction execution */
type Continuation = (fo: ActionExecutor) => void;

/** Holds the UI button label and function to call when the button is clicked */
type UserAction = { label: string, f: ActionExecutor };

/** The list of actions for a single BlobType */
type TypeActions = { t: BlobSniffer, actions: Array<UserAction> };

/**
 * Encapsulation of the function for determining the set of actions that can be taken
 * given knowledge of the type and contents of a file.
 */
type ActionFunction = (t: BlobSniffer, fb: FileBlob) => TypeActions;

/** Function that produces TypeActions with only a {@link FileBlob}. */
type BlobToActions = (fileBlob: FileBlob) => TypeActions;

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
    if (BASIC_PRG.sniff(fileBlob) > 1) {
        const ta = printBasic(BASIC_PRG, fileBlob);
        ta.actions.push(hd);
        return ta;
    }
    for (let i = 0; i < COMMON_MLPS.length; i++) {
        const prg = COMMON_MLPS[i];
        if (prg.sniff(fileBlob) > 1) {
            return disassemble(prg, fileBlob);
        }
    }
    return {t: UNKNOWN, actions: [hd]};
}

export {sniff, Detail};
export type {ActionFunction, TypeActions, Continuation, ActionResult, UserAction, ActionExecutor, BlobToActions}
