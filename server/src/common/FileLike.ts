/**
 * It's like... like a file, but, like... not actually a file?
 */
class FileLike {
  // TODO why does this exist? Remind me.
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