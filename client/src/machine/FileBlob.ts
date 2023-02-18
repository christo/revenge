import {hexByte} from "../misc/BinUtils";

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

    static async fromFile(f: File) {
        let mkBlob = (buf: ArrayBuffer) => new FileBlob(f.name, f.size, new Uint8Array(buf));
        return f.arrayBuffer().then(mkBlob);
    }

    toHexBytes():string[] {
        let elements: string[] = [];
        for (const [_index, entry] of this.bytes.entries()) {
            elements.push((entry & 0xFF).toString(16).padStart(2, '0'));
        }
        return elements;
    }
}

/**
 * Represents a file type that may serve as input data to be analysed. This is where file type detection logic is
 * located and encapsulated. Various methods mostly heuristics can be implemented to detect file contents such as
 * file name extension, magic number prefixes and any kind of deeper analysis.
 *
 * End users should be able to ascribe a type to a given file or may like help in detecting the type. Note that
 * VIC-20 cartridges historically have no file format, unlike the C64 CRT format which has a header. The file
 * extension PRG is often used for the byte dump of typical commodore files in which the first two bytes form the
 * little-endian 16 bit address into which the code expects to be loaded. Many VIC-20 carts were archived in this
 * format.
 *
 */
class BlobType {
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

    extensionMatch(filename: string) {
        return this.exts.reduce((a, n) => a || filename.toLowerCase().endsWith("." + n), false);
    }

    setNote(note: string) {
        this.note = note
    }

    dataMatch(fileBlob: FileBlob) {
        if (this.prefix.length <= fileBlob.size && this.prefix.length > 0) {
            let bytes: Uint8Array = fileBlob.bytes;
            for (let i = 0; i < this.prefix.length; i++) {
                console.log(`${this.prefix[i]} : ${bytes[i]}`)
                if (this.prefix[i] !== bytes[i]) {
                    return false;
                }
            }
            // prefix has matched start of file
            return true;
        } else {
            console.log("prefix length zero or too big: " + this.prefix.length + " for fileblob size: " + fileBlob.size);
            return false;
        }
    }
}

const UNKNOWN = new BlobType("unknown", "type not detected")
const BASIC_PRG = new BlobType("basic prg", "BASIC program", "prg", [0x01, 0x08]);
BASIC_PRG.setNote('BASIC prg files have an expected address prefix and ought to have valid basic token syntax.');

function prg(prefix: ArrayLike<number>) {
    // we assume a prefix of at least 2 bytes
    const addr = hexByte(prefix[1]) + hexByte(prefix[0]); // little-endian rendition
    // consider moving the start address calculation into the BlobByte implementation
    return new BlobType("prg@" + addr, "program binary to load at $" + addr, "prg", prefix);
}

/** Common load addresses for machine language programs. */
const COMMON_MLPS = [
    prg([0x00, 0x60]),  // $6000
    prg([0x00, 0x80]),  // $8000
    prg([0x00, 0xa0]),  // $a000
    prg([0x00, 0xc0]),  // $c000
];

// TODO CRT format as detailed here: https://codebase64.org/doku.php?id=base:crt_file_format


export {FileBlob, BlobType, BASIC_PRG, UNKNOWN, COMMON_MLPS}
