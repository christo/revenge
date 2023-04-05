/*
    Reusable components with the broadest usage domain and no dependencies.
 */

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
    wordToByteArray(word: number):Uint8Array;

    wordToTwoBytes(word:number):[number,number];
    twoBytesToWord(bytes:[number,number]):number;
}

class LittleEndian implements Endian {

    wordToByteArray(word: number) {
        return new Uint8Array([word & 0xff, (word & 0xff00) >> 8]);
    }

    twoBytesToWord(bytes: [number, number]): number {
        TODO();
        return 0;
    }

    wordToTwoBytes(word: number): [number, number] {
        TODO();
        return [0, 0];
    }

}

class BigEndian implements Endian {
    twoBytesToWord(bytes: [number, number]): number {
        TODO();
        return 0;
    }

    wordToByteArray(word: number): Uint8Array {
        TODO();
        return Uint8Array.from([]);
    }

    wordToTwoBytes(word: number): [number, number] {
        TODO();
        return [0, 0];
    }

}

const LITTLE = new LittleEndian();
const BIG = new BigEndian();

/**
 * Takes a byte value in the range 0-255 and interprets its numeric value as an 8 bit two's complement value
 * between -128 and 127.
 *
 * @param x 8 bit signed byte value
 */
const unToSigned = (x: number): number => -(x & 0x80) + (x & 0x7f)

const asHex = (b: number[]) => {
    return b.map(hex8).join(" ");
}

export {unToSigned, assertByte, hex16, hex8, asHex, TODO, toStringArray, toNumberArray, LITTLE, BIG}

export type {Byteable, Address, Endian};
