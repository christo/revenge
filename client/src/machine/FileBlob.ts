/**
 * Abstraction over a file-like thing which stores binary content and has a name and size. Contents can be accessed
 * like a byte array.
 */
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

    /**
     * Read a little-endian 16 bit vector at the given offset.
     *
     * @deprecated TODO replace with an EndianMemory, a wrapper around array which implements reading, pushing etc. words and bytes - also {@link Endian.pushWordBytes}
     * @param offset
     */
    readVector(offset: number) {
        if (offset < 0 || offset > this.bytes.length - 1) {
            throw Error("offset out of range for vector read");
        }
        return (this.bytes[offset + 1] << 8) + this.bytes[offset]
    }

    /**
     * Returns true iff our filename has the given extension.
     *
     * @param ext the part after that last dot in the filename.
     * @param caseInsensitive whether to compare case insensitively.
     */
    hasExt(ext: string, caseInsensitive: boolean = true) {
        const f = caseInsensitive ? (x: string) => x.toLowerCase() : (x: string) => x;
        return f(this.name).endsWith("." + f(ext));
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


export {FileBlob, FileLike};

