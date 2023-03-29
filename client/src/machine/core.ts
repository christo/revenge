/*
    Reusable components with the broadest usage domain and no dependencies.
 */

/**
 * Should be a 16-bit unsigned number. Would like a better way to contrain byte and word values.
 */
type Address = number;

const TODO = (mesg = "") => {
    throw Error(`Not Implemented ${mesg}`)
};

/** Has a byte correspondence */
interface Byteable {
    /** The possibly empty array of byte values. */
    getBytes(): number[];

    /** Length in bytes, must not be negative. */
    getLength(): number;
}

const hex16 = (x: number): string => (0xffff & x).toString(16).padStart(4, "0").toLowerCase();
const hex8 = (x: number): string => (0xff & x).toString(16).padStart(2, "0").toLowerCase();

/** Returns the given string as an array of char codes */
const stringToArray = (s: string): number[] => {
    const prefix = [];
    for (let i = 0; i < s.length; i++) {
        prefix.push(s.charCodeAt(i));
    }
    return prefix;
}

/** Returns the given number after asserting it is in byte range. */
const assertByte = (value: number): number => {
    if (value < 0 || value > 255) {
        throw Error("expecting an unsigned byte value (was " + value + ")");
    }
    return value & 0xff;
};

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

export {unToSigned, assertByte, stringToArray, hex16, hex8, asHex, TODO}

export type {Address, Byteable};