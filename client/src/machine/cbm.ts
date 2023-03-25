// Commodore 8-bit machine stuff

import {FileBlob} from "./FileBlob";
import {
    BlobSniffer,
    BlobType,
    DefaultDialect,
    Directive,
    Disassembler,
    DisassemblyMeta,
    Environment,
    hexDumper,
    Instructionish, PcAssign,
    Tag
} from "./asm";
import {Mos6502} from "./mos6502";
import {asHex, hex16, hex8} from "../misc/BinUtils";
import {ActionExecutor, ActionFunction, ActionResult, Detail, UserAction} from "./revenge";
import {CBM_BASIC_2_0} from "./basic";

/**
 * The expected file extensions for Commodore machines. May need to add more but these seem initially sufficient
 */
const fileTypes = ["prg", "crt", "bin", "d64", "tap", "t64", "rom", "d71", "d81", "p00", "sid", "bas"];

/** User action that disassembles the file. */
export const disassemble: ActionFunction = (t: BlobSniffer, fb: FileBlob) => {
    const dialect = new DefaultDialect(Environment.DEFAULT_ENV);  // to be made configurable later

    let userActions: Array<UserAction> = [{
        label: "disassemble",
        f: () => {
            const dis = new Disassembler(Mos6502.INSTRUCTIONS, fb, t.getDisassemblyMeta());
            let detail = new Detail(["line"], [])

            // set the base address
            const assignPc:Directive = new PcAssign(dis.currentAddress, ["entry"], []);
            detail.tfield.push(assignPc.disassemble(dialect, dis));
            while (dis.hasNext()) {
                const addr = dis.currentAddress;
                let hexAddr: Tag = ["addr", hex16(addr)];
                let full:Instructionish = dis.nextInstructionLine();
                let hex: Tag = ["hex", asHex(full)];
                const items = [hexAddr, hex];

                full.disassemble(dialect, dis).forEach(i => items.push(i));
                detail.tfield.push(items);
            }
            return detail;
        }
    }, hexDumper(fb)];
    return {
        t: t,
        actions: userActions
    };
};

/** Prints the file as a BASIC program. */
const printBasic: ActionFunction = (t: BlobSniffer, fb: FileBlob) => {
    let ar: ActionResult = CBM_BASIC_2_0.decode(fb);
    let d = new Detail(["basic"], ar);
    let ae: ActionExecutor = () => {
        return d;
    };
    return {
        t: t,
        actions: [{
            label: "print basic program",
            f: ae
        }]
    };
};

function prg(prefix: ArrayLike<number>) {
    // prg has a two byte load address
    const addr = hex8(prefix[1]) + hex8(prefix[0]); // little-endian rendition
    // TODO ensure that the file will fit in RAM if loaded at the load address
    return new BlobType("prg@" + addr, "program binary to load at $" + addr, ["prg"], "prg", prefix);
}

/**
 * Cart ROM dumps without any emulator metadata file format stuff.
 * Currently very VIC-20-biased.
 */
class CartSniffer implements BlobSniffer {

    readonly name: string;
    readonly desc: string;
    readonly tags: string[];
    private readonly magic: Uint8Array;
    private readonly magicOffset: number;
    private readonly disassemblyMeta: DisassemblyMeta;

    /**
     * Carts images have a fixed, magic signature of bytes at a known offset.
     *
     * @param name name of the file type
     * @param desc description
     * @param tags hashtags
     * @param magic the magic sequence.
     * @param offset where the magic happens.
     * @param dm describes the disassembly stuff
     */
    constructor(name: string, desc: string, tags: string[], magic: ArrayLike<number>, offset: number, dm: DisassemblyMeta) {
        this.name = name;
        this.desc = desc;
        this.tags = tags;
        this.magic = new Uint8Array(magic);
        this.magicOffset = offset;
        this.disassemblyMeta = dm;
    }

    sniff(fb: FileBlob): number {
        const magicMatch = fb.submatch(this.magic, this.magicOffset) ? 3 : 0.3;
        // TODO look at the warm and cold jump vectors to see if they land in-range and at probable code.
        return magicMatch;
    }

    getDisassemblyMeta(): DisassemblyMeta {
        return this.disassemblyMeta;
    }
}

export {CartSniffer, prg, printBasic, fileTypes};