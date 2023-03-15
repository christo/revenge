import {hex8, stringToArray} from "../misc/BinUtils";

class FileBlob {
    public static NULL_FILE_BLOB: FileBlob = new FileBlob("null", 0, new Uint8Array(0));

    name: string;
    size: number;
    bytes: Uint8Array;

    constructor(name: string, size: number, bytes: Uint8Array) {
        this.name = name;
        this.size = size;
        this.bytes = bytes;
    }

    static async fromFile(f: File | FileLike ) {
        if (f instanceof File) {
            let mkBlob = (buf: ArrayBuffer) => new FileBlob(f.name, f.size, new Uint8Array(buf));
            return f.arrayBuffer().then(mkBlob);
        } else {
            return new FileBlob(f.name, f.size, f.data);
        }
    }

    toHexBytes():string[] {
        let elements: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [_index, entry] of this.bytes.entries()) {
            elements.push((entry & 0xFF).toString(16).padStart(2, '0'));
        }
        return elements;
    }

    submatch(seq: Uint8Array, atOffset: number) {
        if (seq.length + atOffset <= this.size && seq.length > 0) {
            for (let i = 0; i < seq.length; i++) {
                if (seq[i] !== this.bytes[i + atOffset]) {
                    return false;
                }
            }
            // sequence has matched at offset
            return true;
        } else {
            console.log("Sequence length out of range (" + seq.length + ") for fileblob size " + this.size);
            return false;
        }
    }

    /** Read a little-endian vector at the given offset. */
    readVector(offset:number) {
        if (offset < 0 || offset > this.bytes.length - 1) {
            throw Error("offset out of range for vector read");
        }
        return (this.bytes[offset+1]<<8) + this.bytes[offset]
    }
}

class FileLike {
    private readonly _name: string;
    private readonly _data: Uint8Array;
    private readonly _size: number;

    constructor(name: string, data: Uint8Array) {
        if (!data.byteLength) {
            throw Error("byteLength undefined?");
        }
        this._name = name;
        this._data = data;
        this._size=data.byteLength

    }

    get name(): string {
        return this._name;
    }

    get data(): Uint8Array {
        return this._data;
    }

    get size(): number {
        return this._size;
    }
}

/**
 * Abstraction for scoring relative confidence in file content categorisation.
 */
interface BlobSniffer {
    /**
     * Produces a score for the given FileBlob, higher numbers indicate a corresponding higher confidence of
     * a match. Values should be coefficients so that an aggregate score is achieved by multiplication. A
     * value of 1 signifies no indication of a match, less than 1 signifies unlikeliness and greater than 1
     * signifies increasing confidence. Zero is absolute certainty. Negative values must not be returned.
     * @param fb the file contents to sniff
     */
    sniff(fb:FileBlob): number;
    getDisassemblyMeta(): DisassemblyMeta;

    name: string;
    desc: string;
    note: string;
}

/**
 * Represents a file type where file type detection heuristics such as
 * file name extension, magic number prefixes detect file contents.
 */
class BlobType implements BlobSniffer, DisassemblyMeta {

    name: string;
    desc: string;
    exts: string[];
    note: string;
    prefix: Uint8Array;

    constructor(name: string, desc: string, ext?: string, prefix?: ArrayLike<number>) {
        this.desc = desc;
        this.name = name;
        this.exts = ext ? [ext] : [];
        this.note = "";
        this.prefix = prefix ? new Uint8Array(prefix) : new Uint8Array(0);
    }

    baseAddress(fb: FileBlob): number {
        return fb.readVector(CartSniffer.VIC20_BASE_ADDRESS_OFFSET);
    }

    coldResetVector(fb: FileBlob): number {
        return fb.readVector(CartSniffer.VIC20_COLD_VECTOR_OFFSET);
    }
    warmResetVector(fb: FileBlob): number {
        return fb.readVector(CartSniffer.VIC20_WARM_VECTOR_OFFSET);
    }

    disassemblyStartIndex(fb: FileBlob): number {
        // TODO implement segments
        return this.coldResetVector(fb) - this.baseAddress(fb); // HACK bad!
    }

    extensionMatch(fb: FileBlob) {
        const filename = fb.name;
        return this.exts.reduce((a, n) => a || filename.toLowerCase().endsWith("." + n), false);
    }

    getDisassemblyMeta(): DisassemblyMeta {
        return this;
    }

    dataMatch(fileBlob: FileBlob) {
        return fileBlob.submatch(this.prefix, 0);
    }

    sniff(fb: FileBlob): number {
        return (this.dataMatch(fb) ? 2 : 0.5) * (this.extensionMatch(fb) ? 1.5 : 0.9);
    }

    setNote(note: string) {
        this.note = note;
    }
}

/**
 * VIC-20 cartridge magic signature A0CBM in petscii where
 * CBM is in reverse video (&70).
 *
 */
const A0CBM = [0x41, 0x30, 0xc3, 0xc2, 0xcd];
/**
 * The C64 magic cartridge signature CBM80 in petscii.
 */
const CBM80 = [0xC3, 0xC2, 0xCD, 0x38, 0x30];

/** Will have different types of data later (petscii, sid music, character) */
enum SegmentType {
    CODE,DATA
}

class Segment {
    segmentType: SegmentType;
    startOffset: number;
    length: number;

    constructor(segmentType: SegmentType, startOffset: number, length: number) {
        this.segmentType = segmentType;
        this.startOffset = startOffset;
        this.length = length;
    }
}

/**
 * Metadata valuable for disassembling a FileBlob.
 */
interface DisassemblyMeta {
    /**
     * The address the file should be loaded into. Some images may have multiple segments loaded into
     * different addresses and some file formats accommodate this.
     * @param fb the file to get the vector from
     */
    baseAddress(fb: FileBlob): number;

    /**
     * Address of start of code for a cold boot.
     * @param fb the file to get the vector from
     */
    coldResetVector(fb: FileBlob): number;

    /**
     * Address of start of code for a warm boot.
     * @param fb the file to get the vector from
     */
    warmResetVector(fb: FileBlob): number;

    /** Temporary until we implement segments */
    disassemblyStartIndex(fb: FileBlob):number;
}

/**
 * Cart ROM dumps without any emulator metadata file format stuff.
 * Currently very VIC-20-biased.
 */
class CartSniffer implements BlobSniffer, DisassemblyMeta {

    /** VIC-20 cart image that contains A0CBM magic sequence. */
    static VIC20 = new CartSniffer("VIC-20 cart image", "ROM dump from VIC-20", "",A0CBM, 6);

    /** The loading address vector is in the image at this offset. */
    static VIC20_BASE_ADDRESS_OFFSET = 0;
    /** The cold reset vector is stored at this offset. */
    static VIC20_COLD_VECTOR_OFFSET = 2;
    /** The warm reset vector (NMI) is stored at this offset. */
    static VIC20_WARM_VECTOR_OFFSET = 4;
    /** C64 reset vector is stored at this offset. */
    static C64_RESET_VECTOR_OFFSET = 4;

    /**
     * The base address for all 8kb C64 carts.
     */
    static C64_8K_BASE_ADDRESS = 0x8000;

    /**
     * 16kb carts load two 8k blocks, ROML at the normal base address
     * and ROMH at this address.
     */
    static C64_ROMH_BASE_ADDRESS = 0xa000;

    /**
     * Ultimax carts (for the pre-64 Japanese CBM Max machine) load two
     * 8kb images, ROML at the normal base address and ROMH at this one.
     */
    static C64_ULTIMAX_ROMH_BASE_ADDRESS = 0xa000;

    readonly name: string;
    readonly desc: string;
    readonly note: string;
    private readonly magic: Uint8Array;
    private readonly magicOffset: number;

    /**
     * Carts images have a fixed, magic signature of bytes at a known offset.
     *
     * @param magic the magic sequence.
     * @param offset where the magic happens.
     */
    constructor(name:string, desc:string, note:string, magic:ArrayLike<number>, offset:number) {
        this.name = name;
        this.desc = desc;
        this.note = note;
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
        return fb.readVector(CartSniffer.VIC20_BASE_ADDRESS_OFFSET);
    }

    /**
     * Address of start of code for a cold boot.
     * @param fileBlob
     */
    coldResetVector(fb: FileBlob) {
        return fb.readVector(CartSniffer.VIC20_COLD_VECTOR_OFFSET);
    }

    /**
     * Address of start of code for a warm boot; i.e. when RESTORE is hit (?)
     * @param fileBlob
     */
    warmResetVector(fb: FileBlob) {
        return fb.readVector(CartSniffer.VIC20_WARM_VECTOR_OFFSET);
    }

    disassemblyStartIndex(fb: FileBlob): number {
        return this.coldResetVector(fb) - this.baseAddress(fb); // HACK bad!
    }
}

const UNKNOWN = new BlobType("unknown", "type not detected")
const BASIC_PRG = new BlobType("basic prg", "BASIC program", "prg", [0x01, 0x08]);
BASIC_PRG.setNote('BASIC prg files have an expected address prefix and ought to have valid basic token syntax.');

function prg(prefix: ArrayLike<number>) {
    // we assume a prefix of at least 2 bytes
    const addr = hex8(prefix[1]) + hex8(prefix[0]); // little-endian rendition
    // consider moving the start address calculation into the BlobByte implementation
    return new BlobType("prg@" + addr, "program binary to load at $" + addr, "prg", prefix);
}

// CRT format detailed here: https://codebase64.org/doku.php?id=base:crt_file_format
const prefix = stringToArray("C64 CARTRIDGE   ");
const C64_CRT = new BlobType("CCS64 CRT", "ROM cart format by Per Hakan Sundell", "crt", prefix);

/** Common load addresses for machine language programs. */
const COMMON_MLPS = [
    prg([0x00, 0x40]),  // 0x4000
    prg([0x00, 0x60]),  // 0x6000
    prg([0x00, 0x80]),  // 0x8000
    prg([0x00, 0xa0]),  // 0xa000
    prg([0x00, 0xc0]),  // 0xc000
];

export {FileBlob, FileLike, BASIC_PRG, UNKNOWN, COMMON_MLPS, C64_CRT, CartSniffer};
export type {BlobSniffer, DisassemblyMeta};

