import {Byteable} from "../../../server/src/common/Byteable.ts";
import {Addr, hex16, MB_8} from "../../../server/src/common/machine/core.ts";
import {Endian} from "./Endian.ts";

/**
 * Contiguous, fixed-sized 0-based Memory with {@link Endian Endianness}.
 */
interface Memory<T extends Endian> extends Byteable {

  writeable(): boolean;

  executable(): boolean;

  /**
   * Read from the offset a 16 bit word in the right {@link Endian Endianness}.
   *
   * @param byteOffset
   */
  read16(byteOffset: Addr): number;

  /**
   * Gets the {@link Endian endianness}.
   */
  endianness(): T;

  /**
   * Does the given array contain the same data as this array at our given offset.
   *
   * @param seq the array to compare
   * @param atOffset index into our array to compare
   */
  submatch(seq: Uint8Array, atOffset: number): boolean;

  /**
   * Returns true iff the given offset is in our address range.
   *
   * @param offset
   */
  contains(offset: number): boolean;

  /**
   * Loads the given data to the given address.
   *
   * @param data
   * @param location
   */
  load(data: number[], location: Addr): void;
}

/**
 * Represents a contiguous, {@link Endian} Memory, backed by an array.
 */
class ArrayMemory<T extends Endian> implements Memory<T>, Byteable {

  /**
   * Arbitrary conspicuous (0b1010 = 0xa = 10) double-endian fill constant to aid debugging.
   */
  private static EMPTY_MEMORY_FILL = 0b1010;
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
      this._bytes = new Array<number>(bytes as number);
      this._bytes.fill(ArrayMemory.EMPTY_MEMORY_FILL);
    } else {
      if (bytes.length > ArrayMemory.MAX) {
        throw Error(`Memory size ${bytes.length} is greater than maximum ${ArrayMemory.MAX}`);
      }
      this._bytes = bytes;
    }
    this.endian = endian;
  }

  static zeroes<T extends Endian>(size: number, endian: T, writeable: boolean, executable: boolean): ArrayMemory<T> {
    return new ArrayMemory(Array(size).fill(0), endian, writeable, executable);
  }

  executable = (): boolean => this._executable;

  writeable = (): boolean => this._writeable;

  getLength = (): number => this._bytes.length;

  getBytes = () => this._bytes;

  submatch(seq: Uint8Array, atOffset: number): boolean {
    if (seq.length + atOffset <= this._bytes.length && seq.length > 0 && atOffset >= 0) {
      for (let i = 0; i < seq.length; i++) {
        if (seq[i] !== this._bytes[i + atOffset]) {
          return false;
        }
      }
      // sequence has matched at offset
      return true;
    } else {
      return false;
    }
  }

  read16(byteOffset: Addr) {
    if (this.getLength() === 0) {
      throw Error("empty Memory, cannot read");
    }
    // last possible word offset must fit word
    const lastWordAddress = this._bytes.length - 2;
    if (byteOffset < 0 || byteOffset > lastWordAddress) {
      throw Error("offset out of range for word read");
    }
    return this.endian.twoBytesToWord([this._bytes[byteOffset], this._bytes[byteOffset + 1]]);
  }

  read8(byteOffset: Addr): number {
    if (!this.contains(byteOffset)) {
      throw Error(`offset ${byteOffset} out of range 0-${this.getLength()} for vector read`);
    }
    return this._bytes[byteOffset];
  }

  endianness = (): T => this.endian;

  contains = (location: number) => location >= 0 && location < this._bytes.length;

  /**
   * Loads the given data to the given address.
   * @param data
   * @param location
   */
  load(data: number[], location: Addr): void {
    if (data.length + location > this._bytes.length) {
      throw Error(`Not enough room to load ${data.length} bytes at ${location}`);
    }
    data.forEach((b, index) => {
      this._bytes[index + location] = b;
    })
  }

  byteString(): string {
    return this.getBytes().map(hex16).join(" ");
  }
}

export {ArrayMemory};
export {type Memory};