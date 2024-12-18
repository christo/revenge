import {BlobSniffer} from "./BlobSniffer.ts";
import {DisassemblyMeta} from "./asm/DisassemblyMeta.ts";
import {DisassemblyMetaImpl} from "./asm/DisassemblyMetaImpl.ts";
import {FileBlob} from "./FileBlob.ts";

/**
 * Represents a file type where file type detection heuristics such as
 * file name extension, magic number prefixes detect file contents.
 */
class BlobType implements BlobSniffer {

  name: string;
  desc: string;
  exts: string[];
  tags: string[];
  prefix: Uint8Array;
  dm: DisassemblyMeta;

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

const UNKNOWN_BLOB = new BlobType("unknown", "type not detected", []);

export {BlobType, UNKNOWN_BLOB};