import {Disassembler, Mos6502} from "./mos6502";
import {BASIC_PRG, BlobType, COMMON_MLPS, FileBlob, UNKNOWN} from "./FileBlob";
import {hexByte} from "../misc/BinUtils";

// May need to add more but these seem initially sufficient
const fileTypes = ["prg", "crt", "bin", "d64", "tap", "t64", "rom", "d71", "d81", "p00", "sid", "bas"];

type ArrayGen = ()=>Array<any>;
type Continuation = (fo:ArrayGen)=>void;
type UserAction = { label: string, f: ArrayGen }
type TypeActions = { t: BlobType, actions: Array<UserAction>}
type ActionFunction = (t:BlobType, fb:FileBlob)=>TypeActions

/** User action that disassembles the file. */
const disassemble = (t:BlobType, fb:FileBlob) => {
    const dis = new Disassembler(fb.bytes, 2, (fb.bytes[0]<<8) & fb.bytes[1]);
    let userActions:Array<UserAction> = [{
        label: "disassemble",
        f: () => {
            console.log("we were asked to disassemble");
            let out = " *=$" + hexByte(fb.bytes[0]) + hexByte(fb.bytes[1])
            return [{text: out}];
        }
    }];
    return {
        t: t,
        actions: userActions
    };
};


/** User action that prints the file as a basic program. */
const printBasic:ActionFunction = (t: BlobType, fb:FileBlob) => {
    return {
        t: t,
        actions: [{
            label: "print basic program",
            f: () => {
                console.log("we were asked to print basic program");
                // TODO basic decoder
                return ['print "basic" \n '];
            }
        }]
    }
}

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

    return {t:UNKNOWN, actions: []};
}

class C64 {
    cpu;
    constructor() {
        this.cpu = new Mos6502();
    }
}

export {C64, detect, fileTypes};
export type { TypeActions, Continuation, ArrayGen };
