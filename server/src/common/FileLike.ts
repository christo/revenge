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
}

export {FileLike};