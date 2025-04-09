import {DisassemblyMeta} from "./asm/DisassemblyMeta.ts";
import {DisassemblyMetaImpl} from "./asm/DisassemblyMetaImpl.ts";
import {BlobSniffer} from "./BlobSniffer.ts";
import {FileBlob} from "./FileBlob.ts";

/**
 * Represents a file type where file type detection heuristics such as
 * file name extension, magic number prefixes detect file contents.
 */
class BlobTypeSniffer implements BlobSniffer {

  readonly name: string;
  readonly desc: string;
  readonly exts: string[];
  readonly tags: string[];
  readonly prefix: Uint8Array;
  dm: DisassemblyMeta;

  /**
   * Make a sniffer for detecting binaries using stuff like prefix bytes and file extension.
   *
   * @param name unique identifier used to report a detected binary type to the user
   * @param desc elaboration, longer detail about the detection
   * @param tags displayed as "hashtags" on the front-end
   * @param ext expected file extension
   * @param prefix fixed expected value for the first bytes
   * @param dm optional context for possible disassembly
   */
  constructor(name: string, desc: string, tags: string[], ext?: string, prefix?: ArrayLike<number>, dm?: DisassemblyMeta) {
    this.desc = desc;
    this.name = name;
    this.dm = dm ? dm : DisassemblyMetaImpl.NULL_DISSASSEMBLY_META;
    this.exts = ext ? [ext] : [];
    this.tags = tags;
    this.prefix = prefix ? new Uint8Array(prefix) : new Uint8Array(0);
  }

  extensionMatch(fb: FileBlob) {
    return this.exts.reduce((a, n) => a || fb.hasExt(n), false);
  }

  getMeta(): DisassemblyMeta {
    return this.dm;
  }

  dataMatch(fileBlob: FileBlob): boolean {
    return fileBlob.submatch(this.prefix, 0);
  }

  sniff(fb: FileBlob): number {
    return (this.dataMatch(fb) ? 2 : 0.5) * (this.extensionMatch(fb) ? 1.5 : 0.9);
  }
}

const UNKNOWN_TYPE = new BlobTypeSniffer("unknown", "type not detected", []);

export {BlobTypeSniffer, UNKNOWN_TYPE};