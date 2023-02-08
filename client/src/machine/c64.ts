import {Mos6502} from "./mos6502";
import {BASIC_PRG, BlobType, COMMON_MLPS, FileBlob, UNKNOWN} from "./FileBlob";

// May need to add more but these seem initially sufficient
const fileTypes = ["prg", "crt", "bin", "d64", "tap", "t64", "rom", "d71", "d81", "p00", "sid", "bas"];

/** User action that disassembles the file. */
const disassemble = (t:BlobType, fb:FileBlob) => {
    return {
        t: t,
        actions: [{
            label: "disassemble",
            f: () => {
                console.log("we were asked to disassemble");
                return "doneski!";
            }
        }]
    };
};

type UserAction = { label: string, f: () => void }
type TypeActions = { t: BlobType, actions: Array<UserAction>}

/** User action that prints the file as a basic program. */
const printBasic = (t: BlobType, fb:FileBlob) => {
    return {
        t: t,
        actions: [{
            label: "print basic program",
            f: () => {
                console.log("we were asked to print basic program");
                // TODO basic decoder
                return 'print "basic" \n ';
            }
        }]
    }
}

const detect = (fileBlob:FileBlob):TypeActions => {
    if (BASIC_PRG.extensionMatch(fileBlob.name) && BASIC_PRG.dataMatch(fileBlob)) return printBasic(BASIC_PRG, fileBlob);
    for (let i = 0; i < COMMON_MLPS.length; i++) {
        const prg = COMMON_MLPS[i];
        if (prg.dataMatch(fileBlob)) return disassemble(prg, fileBlob);
    }
    return {t:UNKNOWN, actions: []};
}

class C64 {
    cpu;
    constructor() {
        this.cpu = new Mos6502();
    }
}

export {C64, detect, fileTypes};
export type { TypeActions };
