/*
    Reusable components with the broadest usage domain and no dependencies.
 */

/** The number of bytes in a binary kilobyte */
const KB_1 = 1024;

const KB_64 = KB_1 * 64;

/** The number of bytes in a binary megabyte */
const MB_1 = KB_1 * 1024;

/** The number of bytes in 8 old-fashionied megabytes */
const MB_8 = MB_1 * 8;

const TODO = (mesg = "") => {
    throw Error(`Not Implemented ${mesg}`)
};

/** Can produce zero or more bytes of a known length. */
interface Byteable {
    /** The possibly empty array of byte values. Its length must be equal to {@link getLength} */
    getBytes(): number[];

    /** Length in bytes, must equal the number of bytes returned from {@link getBytes} . */
    getLength(): number;
}

/**
 * Should be a 16-bit unsigned number. Would like a better way to contrain byte and word values.
 */
type Address = number;

const hex16 = (x: number): string => (0xffff & x).toString(16).padStart(4, "0").toLowerCase();
const hex8 = (x: number): string => (0xff & x).toString(16).padStart(2, "0").toLowerCase();
const toStringArray = (xs: string[] | string) => ((typeof xs === "string") ? [xs] : xs);
const toNumberArray = (xs: number[] | number) => ((typeof xs === "number") ? [xs] : xs);

/** Returns the given number after asserting it is in byte range. */
const assertByte = (value: number): number => {
    if (value < 0 || value > 255) {
        throw Error("expecting an unsigned byte value (was " + value + ")");
    }
    return value & 0xff;
};

/**
 * Abstraction to hold all endian-specific utilities. See {@link LittleEndian} and {@link BigEndian}
 * implementations.
 */
interface Endian {

    /**
     * Translate a 16 bit value into a Uint8Array.
     *
     * @param word only 16 unsigned integer bits are used.
     */
    wordToByteArray(word: number): Uint8Array;

    wordToTwoBytes(word: number): [number, number];

    /**
     * Two bytes in stream order are returned as a 16 bit word.
     *
     * @param bytes
     */
    twoBytesToWord(bytes: [number, number]): number;

    /**
     * TODO replace this with an endian memory which is a decorated array with word pushing and reading
     * @param array
     * @param word
     */
    pushWordBytes(array: number[], word: number): void;
}

class LittleEndian implements Endian {

    wordToByteArray(word: number) {
        return new Uint8Array([word & 0xff, (word & 0xff00) >> 8]);
    }

    twoBytesToWord(bytes: [number, number]): number {
        return (bytes[1] << 8) + bytes[0];
    }

    wordToTwoBytes(word: number): [number, number] {
        return [word & 0xff, (word & 0xff00) >> 8];
    }

    pushWordBytes(array: number[], word: number) {
        const w = this.wordToTwoBytes(word);
        array.push(w[0], w[1]);
    }
}

class BigEndian implements Endian {

    twoBytesToWord(bytes: [number, number]): number {
        return (bytes[0] << 8) + bytes[1]
    }

    wordToByteArray(word: number): Uint8Array {
        return Uint8Array.from([(word & 0xff00) >> 8, word & 0xff]);
    }

    wordToTwoBytes(word: number): [number, number] {
        return [(word & 0xff00) >> 8, word & 0xff];
    }

    pushWordBytes(array: number[], word: number) {
        const w = this.wordToTwoBytes(word);
        array.push(w[0], w[1]);
    }
}

const LE: LittleEndian = new LittleEndian();
const BE: BigEndian = new BigEndian();

/**
 * Memory with {@link Endian Endianness}.
 */
interface Memory<T extends Endian> {

    /**
     * Read from the offset a 16 bit word in the right {@link Endian Endianness}.
     * @param byteOffset
     */
    read16(byteOffset: Address): number;

    /**
     * Gets the name of the {@link Endian endianness}.
     */
    endianness(): T;

    getLength(): number;

    submatch(seq: Uint8Array, atOffset: number): boolean;
}

/**
 * Represents a contiguous, {@link Endian} Memory, backed by an array.
 */
class ArrayMemory<T extends Endian> implements Memory<T>, Byteable {
    private _bytes: number[];
    private readonly endian: T;

    /** Arbitrary size, big for retro computers. */
    private static MAX: number = MB_8;

    /**
     * Construct with an array of values or a desired size.
     *
     * @param bytes if a size, must be sensible, if an array, we use that.
     * @param endian byte order for word interpretation.
     */
    constructor(bytes: number | number[], endian: T) {
        if (typeof bytes === "number") {
            if (bytes < 0 || bytes > ArrayMemory.MAX) {
                throw Error(`Memory size ${bytes} is not supported`);
            }
            this._bytes = new Array<number>(bytes);
            // arbitrary conspicuous (0b1010 = 0xa = 10) double-endian fill constant to aid debugging
            this._bytes.fill(0b1010);
        } else {
            if (bytes.length > ArrayMemory.MAX) {
                throw Error(`Memory size ${bytes.length} is greater than maximum ${ArrayMemory.MAX}`);
            }
            this._bytes = bytes;
        }
        this.endian = endian;
    }

    getLength(): number {
        return this._bytes.length;
    }

    getBytes() {
        return this._bytes;
    }

    submatch(seq: Uint8Array, atOffset: number):boolean {
        if (seq.length + atOffset <= this._bytes.length && seq.length > 0) {
            for (let i = 0; i < seq.length; i++) {
                if (seq[i] !== this._bytes[i + atOffset]) {
                    return false;
                }
            }
            // sequence has matched at offset
            return true;
        } else {
            console.log("Sequence length out of range (" + seq.length + ") for memory size " + this._bytes.length);
            return false;
        }
    }

    read16(byteOffset: Address) {
        // last possible word offset must fit word
        const lastWordAddress = this._bytes.length - 2;
        if (byteOffset < 0 || byteOffset > lastWordAddress) {
            throw Error("offset out of range for word read");
        }
        return this.endian.twoBytesToWord([this._bytes[byteOffset], this._bytes[byteOffset + 1]]);
    }

    read8(byteOffset: Address) {
        if (byteOffset < 0 || byteOffset > this._bytes.length) {
            throw Error("offset out of range for vector read");
        }
        return this._bytes[byteOffset];
    }

    endianness(): T {
        return this.endian;
    }
}

/**
 * Takes a byte value in the range 0-255 and interprets its numeric value as an 8 bit two's complement value
 * between -128 and 127.
 *
 * @param x 8 bit signed byte value
 */
const unToSigned = (x: number): number => -(x & 0x80) + (x & 0x7f)

/**
 * Returns a string of space-separated hex bytes.
 *
 * @param b the bytes.
 */
const asHex = (b: number[]) => {
    return b.map(hex8).join(" ");
}

export {
    unToSigned,
    assertByte,
    hex16,
    hex8,
    asHex,
    TODO,
    LE,
    BE,
    toStringArray,
    toNumberArray,
    ArrayMemory,
    BigEndian,
    LittleEndian,
    KB_64,
    MB_1,
    MB_8,
}

export type {Byteable, Address, Endian, Memory};
