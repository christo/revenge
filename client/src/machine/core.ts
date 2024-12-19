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
type Addr = number;

const msb = (addr: Addr): number => (addr & 0xff00) >> 8;
const lsb = (addr: Addr): number => addr & 0xff;
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

const asByte = (b: number) => b && 0xff;


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
   *
   * @param array
   * @param word
   */
  pushWordBytes(array: number[], word: number): void;
}

class LittleEndian implements Endian {

  wordToByteArray = (word: number) => new Uint8Array([word & 0xff, (word & 0xff00) >> 8]);

  twoBytesToWord = (bytes: [number, number]): number => (bytes[1] << 8) + bytes[0];

  wordToTwoBytes = (word: number): [number, number] => [word & 0xff, (word & 0xff00) >> 8];

  pushWordBytes(array: number[], word: number) {
    const w = this.wordToTwoBytes(word);
    array.push(w[0], w[1]);
  }
}

class BigEndian implements Endian {

  twoBytesToWord = (bytes: [number, number]): number => (bytes[0] << 8) + bytes[1];

  wordToByteArray = (word: number): Uint8Array => Uint8Array.from([(word & 0xff00) >> 8, word & 0xff]);

  wordToTwoBytes = (word: number): [number, number] => [(word & 0xff00) >> 8, word & 0xff];

  pushWordBytes(array: number[], word: number) {
    const w = this.wordToTwoBytes(word);
    array.push(w[0], w[1]);
  }
}

const LE: LittleEndian = new LittleEndian();
const BE: BigEndian = new BigEndian();

/**
 * Contiguous, fixed-sized 0-based Memory with {@link Endian Endianness}.
 */
interface Memory<T extends Endian> {

  writeable(): boolean;

  executable(): boolean;

  /**
   * Read from the offset a 16 bit word in the right {@link Endian Endianness}.
   * @param byteOffset
   */
  read16(byteOffset: Addr): number;


  read8(byteOffset: Addr): number;

  /**
   * Gets the {@link Endian endianness}.
   */
  endianness(): T;

  getLength(): number;

  submatch(seq: Uint8Array, atOffset: number): boolean;

  contains(location: Addr): boolean;
}

/**
 * Represents a contiguous, {@link Endian} Memory, backed by an array.
 */
class ArrayMemory<T extends Endian> implements Memory<T>, Byteable {
  /** Arbitrary size, plenty for retro computers. */
  private static MAX: number = MB_8;
  private readonly _bytes: number[];
  private readonly endian: T;
  private readonly _writeable: boolean;
  private readonly _executable: boolean;

  /**
   * Construct with an array of values or a desired size.
   *
   * @param bytes if a size, must be sensible, if an array, we use that.
   * @param endian byte order for word interpretation.
   * @param writeable whether this memory is marked as writeable by user code (does not imply immutable)
   * @param executable whether this memory is marked as executable for user code
   */
  constructor(bytes: number | number[], endian: T, writeable = true, executable = true) {
    this._writeable = writeable;
    this._executable = executable;
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

  executable = (): boolean => this._executable;

  writeable = (): boolean => this._writeable;

  getLength = (): number => this._bytes.length;

  getBytes = () => this._bytes;

  submatch(seq: Uint8Array, atOffset: number): boolean {
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

  read16(byteOffset: Addr) {
    // last possible word offset must fit word
    const lastWordAddress = this._bytes.length - 2;
    if (byteOffset < 0 || byteOffset > lastWordAddress) {
      throw Error("offset out of range for word read");
    }
    return this.endian.twoBytesToWord([this._bytes[byteOffset], this._bytes[byteOffset + 1]]);
  }

  read8(byteOffset: Addr): number {
    if (!this.contains(byteOffset)) {
      throw Error("offset out of range for vector read");
    }
    return this._bytes[byteOffset];
  }

  endianness = (): T => this.endian;

  contains = (location: Addr) => location >= 0 && location < this._bytes.length;
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
const asHex = (b: number[]) => b.map(hex8).join(" ")

export {
  unToSigned,
  asByte,
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

export type {Byteable, Addr, Endian, Memory};
export {msb, lsb};
