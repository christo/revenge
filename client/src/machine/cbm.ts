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
    Instructionish,
    PcAssign,
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
            const assignPc: Directive = new PcAssign(dis.currentAddress, ["entry"], []);
            detail.tfield.push(assignPc.disassemble(dialect, dis));
            while (dis.hasNext()) {
                let addr: Tag = ["addr", hex16(dis.currentAddress)];
                let inst: Instructionish = dis.nextInstructionLine();
                let hex: Tag = ["hex", asHex(inst)];
                const items = [addr, hex,];

                inst.disassemble(dialect, dis).forEach(i => items.push(i));
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
            label: "decode basic",
            f: ae
        }]
    };
};

/**
 * PRG refers to the Commodore program binary file format which merely prefixes the content with the load address.
 *
 * @param prefix
 */
function prg(prefix: ArrayLike<number>) {
    // prg has a two byte load address
    const addr = hex8(prefix[1]) + hex8(prefix[0]); // little-endian rendition
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
        return fb.submatch(this.magic, this.magicOffset) ? 3 : 0.3;
    }

    getDisassemblyMeta(): DisassemblyMeta {
        return this.disassemblyMeta;
    }
}

/**
 * Translate a 16 bit value into a Uint8Array in the correct endianness.
 * Future: migrate to a little endian encapsulation
 *
 * @param word the 16 bit value
 */
function wordToEndianBytes(word: number) {
    return new Uint8Array([word & 0xff, (word & 0xff00) >> 8]);
}

/**
 * Available memory, basic load addres etc.
 */
class MemoryConfiguration {
    name: string;
    basicStart: number;

    /**
     * Create a memory configuration.
     *
     * @param name for display
     * @param basicStart 16 bit address where BASIC programs are loaded
     */
    constructor(name: string, basicStart: number) {
        this.name = name;
        this.basicStart = basicStart;
    }
}

export {CartSniffer, prg, printBasic, fileTypes, MemoryConfiguration, wordToEndianBytes};
