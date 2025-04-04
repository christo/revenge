/**
 * Flexible file-like abstraction backed by a byte array.
 */
class FileLike {
  static foo = () => { console.log("loading FileLike"); return "foo"};
  static bar = FileLike.foo();
  private readonly _name: string;
  private readonly _data: Uint8Array;
  private readonly _size: number;

  constructor(name: string, data: Uint8Array) {
    if (!data.byteLength) {
      throw Error("byteLength undefined?");
    }
    this._name = name;
    this._data = data;
    this._size = data.byteLength
  }

  get name(): string {
    return this._name;
  }

  get data(): Uint8Array {
    return this._data;
  }

  get size(): number {
    return this._size;
  }
}

export {FileLike};