// Commodore 8-bit machine stuff

import {FileBlob} from "./FileBlob";
import {BlobSniffer, BlobType, DefaultDialect, Disassembler, DisassemblyMeta, Environment} from "./asm";
import {Mos6502} from "./mos6502";
import {hex16, hex8} from "../misc/BinUtils";
import {ActionExecutor, ActionFunction, ActionResult, Detail, UserAction} from "./revenge";

/**
 * The expected file extensions for Commodore machines. May need to add more but these seem initially sufficient
 */
const fileTypes = ["prg", "crt", "bin", "d64", "tap", "t64", "rom", "d71", "d81", "p00", "sid", "bas"];

/** User action that disassembles the file. */
export const disassemble = (t: BlobSniffer, fb: FileBlob) => {
    const dialect = new DefaultDialect(Environment.DEFAULT_ENV);  // to be made configurable later

    let userActions: Array<UserAction> = [{
        label: "disassemble",
        f: () => {
            const dis = new Disassembler(Mos6502.INSTRUCTIONS, fb, t.getDisassemblyMeta());
            let detail = new Detail([], [])

            // start with assembler directive for setting the base address.
            const base = "$" + hex16(t.getDisassemblyMeta().baseAddress(fb));
            detail.tfield.push([["pct", "*"], ["assign", "="], ["hloc", base]]);

            while (dis.hasNext()) {
                const addr = dis.currentAddress;
                let hexAddr: [string, string] = ["addr", hex16(addr)];
                let full = dis.nextInstructionLine();
                let hex: [string, string] = ["hex", full.asHex()];
                const items = [hexAddr, hex];
                dialect.tagged(full).forEach(i => items.push(i));
                detail.tfield.push(items);
            }
            return detail;
        }
    }];
    return {
        t: t,
        actions: userActions
    };
};

/** Prints the file as a BASIC program. */
const printBasic: ActionFunction = (t: BlobSniffer, fb: FileBlob) => {
    let ar: ActionResult = [[["debug", 'print ya basic \n ']]];
    let d = new Detail([], ar);
    let ae: ActionExecutor = () => {
        // TODO basic decoder action
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

const BASIC_PRG = new BlobType("basic prg", "BASIC program", ["basic"], "prg", [0x01, 0x08]);

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

export {CartSniffer, prg, printBasic, fileTypes, BASIC_PRG};