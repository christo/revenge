import {DisassemblyMeta} from "../asm/DisassemblyMeta.js";
import {BlobSniffer, Stench} from "../BlobSniffer.js";
import {FileBlob} from "../FileBlob.js";

/**
 * Detects raw cartridge ROM dumps. Currently CBM biased.
 */
class CartSniffer implements BlobSniffer {

  readonly name: string;
  readonly desc: string;
  readonly hashTags: string[];
  private readonly magic: Uint8Array;
  private readonly magicOffset: number;
  private readonly disassemblyMeta: DisassemblyMeta;

  /**
   * Carts images have a fixed, magic signature of bytes at a known offset.
   *
   * @param name name of the file type
   * @param desc description
   * @param tags hashtags
   * @param magic the magic sequence.
   * @param offset where the magic happens.
   * @param dm describes the disassembly stuff
   */
  constructor(name: string, desc: string, tags: string[], magic: ArrayLike<number>, offset: number, dm: DisassemblyMeta) {
    this.name = name;
    this.desc = desc;
    this.hashTags = tags;
    this.magic = new Uint8Array(magic);
    this.magicOffset = offset;
    this.disassemblyMeta = dm;
  }

  /**
   * If we match the magic number at the start of the file it's a pretty strong
   * signal that this is a cart.
   * @param fb fileblob to check for being a cart
   */
  sniff(fb: FileBlob): Stench {
    return {score: fb.submatch(this.magic, this.magicOffset) ? 3 : 0.3, messages: []};
  }

  getMeta(): DisassemblyMeta {
    return this.disassemblyMeta;
  }
}

export {CartSniffer};