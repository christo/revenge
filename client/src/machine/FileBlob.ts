import {FileLike} from "../../../server/src/common/FileLike.ts";
import {Byteable} from "./Byteable.ts";
import {Addr, hex16} from "./core";
import {BE, Endian} from "./Endian.ts";
import {ArrayMemory, Memory} from "./Memory.ts";

/**
 * Abstraction over a file-like thing which stores binary content and has a name and size. Contents can be accessed
 * like a byte array.
 */
class FileBlob implements Byteable {

  // TODO this seems to have Endianness always thanks to this.memory - look into why it's not on the interface
  //   maybe it's because we have a little endian platform hard-coded somewhere upstream the call graph and
  //   won't know until we implement a big endian platform - maybe fix it in unit tests with a mock platform?

  public static NULL_FILE_BLOB: FileBlob = FileBlob.fromBytes("null", 0, BE);

  readonly name: string;
  private readonly memory: ArrayMemory<Endian>;

  constructor(name: string, memory: ArrayMemory<Endian>) {
    this.name = name;
    this.memory = memory;
  }

  static fromBytes(name: string, bytes: number | number[], endian: Endian) {
    return new FileBlob(name, new ArrayMemory(bytes, endian));
  }

  static async fromFile(f: File | FileLike, endian: Endian) {
    if (f instanceof File) {
      const buf = await f.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buf));
      return FileBlob.fromBytes(f.name, bytes, endian);
    } else {
      return FileBlob.fromBytes(f.name, Array.from(f.data), endian);
    }
  }

  asEndian(): Memory<Endian> {
    // TODO fix this smell - temporary type hack due to ignorance and impatience
    return this.memory;
  }

  getBytes(): number[] {
    return this.memory.getBytes();
  }

  getLength(): number {
    return this.memory.getLength();
  }

  byteString(): string {
    return this.getBytes().map(hex16).join(" ");
  }

  read16(byteOffset: number): number {
    return this.memory.read16(byteOffset);
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
  hasExt(ext: string, caseInsensitive = true) {
    const f = caseInsensitive ? (x: string) => x.toLowerCase() : (x: string) => x;
    return f(this.name).endsWith("." + f(ext));
  }

  read8(offset: Addr): number {
    return this.memory.read8(offset);
  }
}

export {FileBlob};

