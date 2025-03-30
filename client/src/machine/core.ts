/*
    Reusable components with the broadest domain and no dependencies.
 */

/** The number of bytes in a binary kilobyte */
const KB_1 = 1024;

const KB_64 = KB_1 * 64;

/** The number of bytes in a binary megabyte */
const MB_1 = KB_1 * 1024;

/** The number of bytes in 8 old-fashionied megabytes */
const MB_8 = MB_1 * 8;

/** Convenience dev-time error thrower like the cool languages have. */
const TODO = (mesg = "") => {
  throw Error(`Not Implemented ${mesg}`)
};

/**
 * Should be a 16-bit unsigned number. Would like a better way to contrain byte and word values.
 */
type Addr = number;

/** Most significant byte from address */
const msb = (addr: Addr): number => (addr & 0xff00) >> 8;
/** Least significant byte from address */
const lsb = (addr: Addr): number => addr & 0xff;
/** Hexadecimal four-digit string */
const hex16 = (x: number): string => (0xffff & x).toString(16).padStart(4, "0").toLowerCase();
/** Hexadecimal two-digit string */
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
const asHex = (b: number[]) => b.map(hex8).join(" ")

export {
  unToSigned,
  assertByte,
  hex16,
  hex8,
  asHex,
  TODO,
  toStringArray,
  toNumberArray,
  KB_64,
  MB_1,
  MB_8,
}

export type {Addr};
export {msb, lsb};
