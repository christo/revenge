// Shared Commodore 8-bit machine stuff

import {FileBlob} from "./FileBlob";
import {
    BlobSniffer,
    BlobType,
    DefaultDialect,
    Directive,
    Disassembler,
    DisassemblyMeta,
    Environment,
    Instructionish,
    PcAssign
} from "./asm";
import {Mos6502} from "./mos6502";
import {asHex, hex16, hex8} from "./core";
import {ActionFunction, Detail, hexDumper, LogicalLine, NewDataView, Tag, UserAction} from "./api";
import {CBM_BASIC_2_0} from "./basic";

/**
 * The expected file extensions for Commodore machines. May need to add more but these seem initially sufficient
 */
const fileTypes = ["prg", "crt", "bin", "d64", "tap", "t64", "rom", "d71", "d81", "p00", "sid", "bas"];

/** User action that disassembles the file. */
export const disassemble: ActionFunction = (t: BlobSniffer, fb: FileBlob) => {
    const dialect = new DefaultDialect(Environment.DEFAULT_ENV);  // to be made configurable later

    let userActions: [UserAction, ...UserAction[]] = [{
        label: "disassembly",
        f: () => {
            // start timer
            const startTime = Date.now();
            const dis = new Disassembler(Mos6502.INSTRUCTIONS, fb, t);
            const dv = new NewDataView([]);
            let detail = new Detail(["line"], dv)

            // set the base address
            const assignPc: Directive = new PcAssign(dis.currentAddress, ["entry"], []);
            const tagSeq = assignPc.disassemble(dialect, dis);
            detail.tfield.lines.push(new LogicalLine(tagSeq));
            while (dis.hasNext()) {
                let addr: Tag = new Tag(hex16(dis.currentAddress), "addr");
                let inst: Instructionish = dis.nextInstructionLine();
                let hex: Tag = new Tag(asHex(inst.getBytes()), "hex");
                const tags = [addr, hex];

                inst.disassemble(dialect, dis).forEach(i => tags.push(i));
                // TODO link up internal jumptargets so cross-references can be marked on both ends
                //  need to keep a list of all instructions somewhere, then call jumpTargets on the full sequence
                detail.tfield.lines.push(new LogicalLine(tags));
            }
            const stats = dis.getStats();
            // for now assuming there's no doubling up of stats keys
            stats.forEach((v, k) => detail.stats.push([k, v.toString()]));
            detail.stats.push(["lines", detail.tfield.lines.length.toString()]);
            const timeTaken = Date.now() - startTime;
            detail.stats.push(["disassembled in", timeTaken.toString() + " ms"])
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
    return {
        t: t,
        actions: [{
            label: "basic",
            f: () => {
                const detail = new Detail(["basic"], CBM_BASIC_2_0.decode(fb));
                // exclude "note" tags which are not a "line"
                const justLines = (ll:LogicalLine) => ll.getTags().find((t:Tag) => t.hasTag("line")) !== undefined;
                detail.stats.push(["lines", detail.tfield.lines.filter(justLines).length.toString()]);
                return detail;
            }
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

    getMeta(): DisassemblyMeta {
        return this.disassemblyMeta;
    }
}

export {CartSniffer, prg, printBasic, fileTypes};
