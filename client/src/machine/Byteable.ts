/** Can produce zero or more bytes of a known length. */
interface Byteable {
  /** The possibly empty array of byte values. Its length must be equal to {@link getLength} */
  getBytes(): number[];

  /** Length in bytes, must equal the number of bytes returned from {@link getBytes} . */
  getLength(): number;

  /** Get a single byte from the given offset */
  read8(offset: number): number;

  byteString(): string;
}

export {type Byteable};