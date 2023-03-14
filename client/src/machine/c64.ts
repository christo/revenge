import {DefaultDialect, Disassembler, Environment, Mos6502} from "./mos6502";
import {BASIC_PRG, BlobType, COMMON_MLPS, FileBlob, UNKNOWN} from "./FileBlob";
import {hex16, hex8} from "../misc/BinUtils";

// May need to add more but these seem initially sufficient
const fileTypes = ["prg", "crt", "bin", "d64", "tap", "t64", "rom", "d71", "d81", "p00", "sid", "bas"];


type ActionExecutor = ()=>ActionResult;

/**
 * Representation of a generic view of data, a vertical sequence of horizontal string of kv pairs.
 * A generic displayable structure with a sequence of entries. Each entry is a sequence of
 * string tuples. The string tuple represents a name-value pair that will be rendered with
 * the name as a className and the value as the text content of a span element.
 */
type ActionResult = [string,string][][]; // 2d array of tuples

/** A type for handling the result of a UserAction execution */
type Continuation = (fo:ActionExecutor)=>void;

/** Holds the UI button label and function to call when the button is clicked */
type UserAction = { label: string, f: ActionExecutor };

/** The list of actions for a single BlobType */
type TypeActions = { t: BlobType, actions: Array<UserAction>};

/**
 * Encapsulation of the function for determining the set of actions that can be taken
 * given knowledge of the type and contents of a file.
 */
type ActionFunction = (t:BlobType, fb:FileBlob)=>TypeActions;

/** User action that disassembles the file. */
const disassemble = (t:BlobType, fb:FileBlob) => {
    const dialect = new DefaultDialect(Environment.DEFAULT_ENV);  // to be made configurable later
    const dis = new Disassembler(fb.bytes, 2, (fb.bytes[0]<<8) & fb.bytes[1]);
    let userActions:Array<UserAction> = [{
        label: "disassemble",
        f: () => {
            let disassemblyResult:ActionResult = [];
            disassemblyResult.push([["pct", "*"], ["assign", "="], ["hloc", "$" + hex8(fb.bytes[1]) + hex8(fb.bytes[0])]]);
            dis.reset();
            while(dis.hasNext()) {
                let disasm:[string, string] = ["dis", dialect.render(dis.nextInstructionLine())];
                let addr:[string, string] = ["addr", hex16(dis.currentAddress)]
                disassemblyResult.push([disasm]);
            }
            return disassemblyResult;
        }
    }];
    return {
        t: t,
        actions: userActions
    };
};


/** User action that prints the file as a basic program. */
const printBasic:ActionFunction = (t: BlobType, fb:FileBlob) => {
    let ar:ActionResult = [[["debug",'print ya basic \n ']]];

    let ae:ActionExecutor = () => {
        // TODO basic decoder action
        return ar;
    };
    return {
        t: t,
        actions: [{
            label: "print basic program",
            f: ae
        }]
    };
};

const hexDumper:UserAction = {
    label: "Hex Dump",
    f: () => {
        // TODO rewrite hexdump to work with this structure; may need to add outer className to ActionResult
        return [[["hexbyte", "ff"]]];
    }
};

/**
 * Returns a best-guess file type and user actions that can be done on it.
 *
 * @param fileBlob
 */
const detect = (fileBlob:FileBlob):TypeActions => {
    // run through various detection matchers, falling through to unknown
    if (BASIC_PRG.extensionMatch(fileBlob.name) && BASIC_PRG.dataMatch(fileBlob)) return printBasic(BASIC_PRG, fileBlob);
    for (let i = 0; i < COMMON_MLPS.length; i++) {
        const prg = COMMON_MLPS[i];
        if (prg.dataMatch(fileBlob)) return disassemble(prg, fileBlob);
    }

    // consider collecting partial matchers which give a scored collection of hints - what the file could be based
    // on some features. For example a 'prg' extension suggests the file is in original commodore format with the
    // load address as the first two little endian bytes.

    return {t:UNKNOWN, actions: [hexDumper]};
}

// we don't need this yet...
class C64 {
    cpu;
    constructor() {
        this.cpu = new Mos6502();
    }
}

export {C64, detect, fileTypes};
export type { TypeActions, Continuation, ActionExecutor, ActionResult, UserAction };
