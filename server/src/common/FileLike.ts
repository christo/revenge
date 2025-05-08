import {Byteable} from "./Byteable.js";

/**
 * Flexible file-like abstraction backed by a byte array.
 */
class FileLike {
  readonly name: string;
  readonly data: number[];
  readonly size: number;

  constructor(name: string, data: number[]) {
    this.name = name;
    this.data = data;
    this.size = data.length;
  }

  /**
   * Adapts to Byteable interface
   */
  toByteable(): Byteable {
    return {
      getBytes: () => this.data,
      getLength: () => this.size,
      read8: (offset: number) => (this.data[offset] || 0) && 0xff,
      byteString: () => this.data.map(b => b.toString(16).padStart(2, '0')).join(' ')
    };
  }

}

export {FileLike};