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

    static async fromFile(f: File | FileLike) {
        if (f instanceof File) {
            let mkBlob = (buf: ArrayBuffer) => new FileBlob(f.name, f.size, new Uint8Array(buf));
            return f.arrayBuffer().then(mkBlob);
        } else {
            return new FileBlob(f.name, f.size, f.data);
        }
    }

    toHexBytes(): string[] {
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
    readVector(offset: number) {
        if (offset < 0 || offset > this.bytes.length - 1) {
            throw Error("offset out of range for vector read");
        }
        return (this.bytes[offset + 1] << 8) + this.bytes[offset]
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
        this._size = data.byteLength

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
    sniff(fb: FileBlob): number;

    getDisassemblyMeta(): DisassemblyMeta;

    name: string;
    desc: string;
    note: string;
}

/**
 * Represents a file type where file type detection heuristics such as
 * file name extension, magic number prefixes detect file contents.
 */
class BlobType implements BlobSniffer {

    name: string;
    desc: string;
    exts: string[];
    note: string;
    prefix: Uint8Array;
    dm: DisassemblyMeta;

    constructor(name: string, desc: string, ext?: string, prefix?: ArrayLike<number>, dm?: DisassemblyMeta) {
        this.desc = desc;
        this.name = name;
        this.dm = dm ? dm : NullDisassemblyMeta.INSTANCE;
        this.exts = ext ? [ext] : [];
        this.note = "";
        this.prefix = prefix ? new Uint8Array(prefix) : new Uint8Array(0);
    }

    extensionMatch(fb: FileBlob) {
        const filename = fb.name;
        return this.exts.reduce((a, n) => a || filename.toLowerCase().endsWith("." + n), false);
    }

    getDisassemblyMeta(): DisassemblyMeta {
        return this.dm;
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

/** Will have different types of data later (petscii, sid music, character) */
enum SegmentType {
    CODE, DATA
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
    disassemblyStartIndex(fb: FileBlob): number;

    contentStartIndex(fb: FileBlob): number;
}

class NullDisassemblyMeta implements DisassemblyMeta {

    static INSTANCE = new NullDisassemblyMeta();

    private constructor() {
        // intentionally left blank
    }

    baseAddress(fb: FileBlob): number {
        return 0;
    }

    coldResetVector(fb: FileBlob): number {
        return 0;
    }

    contentStartIndex(fb: FileBlob): number {
        return 0;
    }

    disassemblyStartIndex(fb: FileBlob): number {
        return 0;
    }

    warmResetVector(fb: FileBlob): number {
        return 0;
    }

}


const UNKNOWN = new BlobType("unknown", "type not detected",)
export {FileBlob, FileLike, UNKNOWN, BlobType};
export type {BlobSniffer, DisassemblyMeta};

