import {Address, ArrayMemory, BE, Byteable, Endian} from "./core";

/**
 * Abstraction over a file-like thing which stores binary content and has a name and size. Contents can be accessed
 * like a byte array.
 */
class FileBlob implements Byteable {
    public static NULL_FILE_BLOB: FileBlob = new FileBlob("null", 0, BE);

    name: string;
    private memory: ArrayMemory<Endian>;

    constructor(name: string, bytes: number | number[], endian: Endian) {
        this.name = name;
        this.memory = new ArrayMemory(bytes, endian);
    }

    getBytes(): number[] {
        return this.memory.getBytes();
    }

    getLength(): number {
        return this.memory.getLength();
    }

    read16(byteOffset: Address): number {
        return this.memory.read16(byteOffset);
    }

    static async fromFile(f: File | FileLike, endian: Endian) {
        if (f instanceof File) {
            let mkBlob = (buf: ArrayBuffer) => new FileBlob(f.name, Array.from(new Uint8Array(buf)), endian);
            return f.arrayBuffer().then(mkBlob);
        } else {
            return new FileBlob(f.name, Array.from(f.data), endian);
        }
    }

    submatch(seq: Uint8Array, atOffset: number) {
        return this.memory.submatch(seq, atOffset);
    }

    /**
     * Read a 16 bit vector at the given offset using correct endianness.
     *
     * @param offset
     */
    readVector(offset: number) {
        return this.memory.read16(offset);
    }

    /**
     * Returns true iff our filename has the given extension.
     *
     * @param ext the part after the last dot in the filename (dot must exist).
     * @param caseInsensitive whether to compare case insensitively.
     */
    hasExt(ext: string, caseInsensitive: boolean = true) {
        const f = caseInsensitive ? (x: string) => x.toLowerCase() : (x: string) => x;
        return f(this.name).endsWith("." + f(ext));
    }

    read8(offset: Address) {
        return this.memory.read8(offset);
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

