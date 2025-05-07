import {Byteable} from "../Byteable.js";
import {Addr, hex16} from "./core.js";

/**
 * A machine ROM with a known load address.
 */
class RomImage implements Byteable {
  private readonly name: string;
  private readonly loadAt: Addr;
  private readonly contents: number[];

  constructor(name: string, loadAt: number, contents: number[]) {
    this.name = name;
    this.loadAt = loadAt;
    this.contents = contents;
  }

  getName(): string {
    return this.name;
  }

  getLoadAddress(): Addr {
    return this.loadAt;
  }

  getBytes(): number[] {
    return this.contents;
  }

  getLength(): number {
    return this.contents.length;
  }

  read8(offset: number): number {
    return this.contents[offset] && 0xff;
  }

  byteString(): string {
    return this.getBytes().map(hex16).join(" ");
  }
}

export {RomImage};