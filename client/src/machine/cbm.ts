// Commodore 8-bit machine stuff

import {BlobSniffer, BlobType, DisassemblyMeta, FileBlob} from "./FileBlob";
import {DefaultDialect, Disassembler, Environment} from "./asm";
import {Mos6502} from "./mos6502";
import {hex16, hex8} from "../misc/BinUtils";
import {ActionExecutor, ActionFunction, ActionResult, UserAction} from "./revenge";


// May need to add more but these seem initially sufficient
const fileTypes = ["prg", "crt", "bin", "d64", "tap", "t64", "rom", "d71", "d81", "p00", "sid", "bas"];

/** User action that disassembles the file. */
export const disassemble = (t: BlobSniffer, fb: FileBlob) => {
    const dialect = new DefaultDialect(Environment.DEFAULT_ENV);  // to be made configurable later

    let userActions: Array<UserAction> = [{
        label: "disassemble",
        f: () => {
            const dis = new Disassembler(Mos6502.INSTRUCTIONS, fb, t.getDisassemblyMeta());
            let disassemblyResult: ActionResult = [];

            // start with assembler directive for setting the base address.
            const base = "$" + hex16(t.getDisassemblyMeta().baseAddress(fb));
            disassemblyResult.push([["pct", "*"], ["assign", "="], ["hloc", base]]);

            while (dis.hasNext()) {
                const addr = dis.currentAddress;
                let hexAddr: [string, string] = ["addr", hex16(addr)];
                let full = dis.nextInstructionLine();
                let hex: [string, string] = ["hex", full.asHex()];
                const items = [hexAddr, hex];
                const disasm = dialect.tagged(full);
                disasm.forEach(i=>items.push(i));
                disassemblyResult.push(items);
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
const printBasic: ActionFunction = (t: BlobSniffer, fb: FileBlob) => {
    let ar: ActionResult = [[["debug", 'print ya basic \n ']]];

    let ae: ActionExecutor = () => {
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


const BASIC_PRG = new BlobType("basic prg", "BASIC program", "prg", [0x01, 0x08]);
BASIC_PRG.setNote('BASIC prg files have an expected address prefix and ought to have valid basic token syntax.');

function prg(prefix: ArrayLike<number>) {
    // we assume a prefix of at least 2 bytes
    const addr = hex8(prefix[1]) + hex8(prefix[0]); // little-endian rendition
    // consider moving the start address calculation into the BlobByte implementation
    return new BlobType("prg@" + addr, "program binary to load at $" + addr, "prg", prefix);
}


/**
 * Cart ROM dumps without any emulator metadata file format stuff.
 * Currently very VIC-20-biased.
 */
class CartSniffer implements BlobSniffer, DisassemblyMeta {

    readonly name: string;
    readonly desc: string;
    readonly note: string;
    private readonly magic: Uint8Array;
    private readonly magicOffset: number;
    private baseAddressOffset: number;
    private coldVectorOffset: number;
    private warmVectorOffset: number;

    /**
     * Carts images have a fixed, magic signature of bytes at a known offset.
     *
     * @param name
     * @param desc
     * @param note
     * @param magic the magic sequence.
     * @param offset where the magic happens.
     * @param baseAddressOffset
     * @param coldVectorOffset
     * @param warmVectorOffset
     */
    constructor(name: string, desc: string, note: string, magic: ArrayLike<number>, offset: number, baseAddressOffset: number, coldVectorOffset: number, warmVectorOffset: number) {
        this.name = name;
        this.desc = desc;
        this.note = note;
        this.baseAddressOffset = baseAddressOffset;
        this.coldVectorOffset = coldVectorOffset;
        this.warmVectorOffset = warmVectorOffset;
        this.magic = new Uint8Array(magic);
        this.magicOffset = offset;
    }

    sniff(fb: FileBlob): number {
        const magicMatch = fb.submatch(this.magic, this.magicOffset) ? 3 : 0.3;
        // TODO look at the warm and cold jump vectors to see if they land in-range and at probable code.
        return magicMatch;
    }

    getDisassemblyMeta(): DisassemblyMeta {
        return this;
    }

    /**
     * The address the file should be loaded into. Real images have multiple segments loaded into
     * different addresses and some file formats accommodate this.
     * @param fileBlob
     */
    baseAddress(fb: FileBlob) {
        return fb.readVector(this.baseAddressOffset);
    }

    /**
     * Address of start of code for a cold boot.
     * @param fileBlob
     */
    coldResetVector(fb: FileBlob) {
        return fb.readVector(this.coldVectorOffset);
    }

    /**
     * Address of start of code for a warm boot; i.e. when RESTORE is hit (?)
     * @param fileBlob
     */
    warmResetVector(fb: FileBlob) {
        return fb.readVector(this.warmVectorOffset);
    }

    disassemblyStartIndex(fb: FileBlob): number {
        return this.coldResetVector(fb) - this.baseAddress(fb); // HACK bad!
    }

    contentStartIndex(fb: FileBlob): number {
        return 2; // TODO fix
    }

}

export {CartSniffer, prg, printBasic, fileTypes, BASIC_PRG};