// assembler / disassembler stuff - 6502-specific
// noinspection JSUnusedGlobalSymbols

import {Tag} from "../api.ts";
import {Addr, toStringArray} from "../core.ts";
import {FileBlob} from "../FileBlob.ts";
import {SymDef} from "./instructions.ts";

/**
 * Defines a semantic category for a line of assembly source.
 */
const enum SourceType {
  /** Machine code instruction */
  MACHINE,
  /** Data declaration */
  DATA,
  /** Assembly directive or pseudo-op, including symbol definitions. */
  PSEUDO,
  /** Just label definition */
  LABEL,
  /** Comments and or labels */
  COMMENT_LABEL,
  /** Forced space. */
  BLANK
}

// noinspection JSUnusedGlobalSymbols

/** Will have different types of data later (petscii, sid music, character) */
const enum SectionType {
  /** Non-executable data. */
  DATA,
  /** Executable machine code. */
  CODE,
  /** Self-modifiable code. May not always look like valid code, but will be when executed. */
  SELF_MOD,
  /** Type is not known. */
  UNKNOWN
}

// noinspection JSUnusedGlobalSymbols

/** Designates the dynamic meaning of a sequence of bytes in the binary. */
class Section {

  static DEFAULT_TYPE = SectionType.DATA;

  startOffset: number;
  length: number;
  writeable: boolean;
  private readonly sType: SectionType;

  constructor(startOffset: number, length: number, writeable: boolean, sType?: SectionType) {
    this.startOffset = startOffset;
    this.length = length;
    this.writeable = writeable;
    this.sType = (typeof sType === "undefined") ? Section.DEFAULT_TYPE : sType;
  }

  get endOffset() {
    return this.startOffset + this.length;
  }

  get sectionType() {
    return this.sType;
  }
}

/**
 * Holds format config, options etc.
 * Difference between Dialect and Environment is that a Dialect might be specific to the target assembler
 * syntax used, whereas the Environment has local configuration like line endings, comment decoration styling,
 * text encoding, natural language (e.g. can generate german comments) and per-line choices for using labels
 * including globally known memory map symbols. Some people want numeric values for certain locations, other
 * people want symbols. Dialect holds stuff like what is the comment style - prefix char for line comments is
 * often ';' but for kick assembler, it's '//' and kick also supports block comments whereas others may not.
 * Having said that, the Dialect should accept configuration and the Environment is the best place for this to
 * live.
 *
 * Reverse engineering session config, etc. should go in the environment but maybe the default environment
 * for newly created sessions can be configured per-user too.
 *
 */
class Environment {
  static DEFAULT_ENV = new Environment();

  targetLineEndings() {
    return "\n";
  }

  indent() {
    return "    ";
  }
}

/** There are different types of symbols duh. */
enum SymbolType {
  "reg",
  /**
   * Subroutine symbol.
   */
      "sub"
}

/**
 * Table of single symbol to single address. Names and addresses must be unique.
 */
class SymbolTable {

  // future: keep kernal symbols in a separate table from user-defined symbols, also can have multimap

  private addressToSymbol: Map<Addr, SymDef> = new Map<Addr, SymDef>();
  private readonly name: string;
  /**
   * string lookup
   * @private
   */
  private nameToSymbol: Map<string, SymDef> = new Map<string, SymDef>();

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Register a new symbol for the described subroutine. One must not already exist with the same name or address.
   *
   * @param addr address the symbol refers to.
   * @param name name to be used instead of the address.
   * @param desc a more verbose description of the symbol.
   * @param blurb extended info.
   */
  sub(addr: Addr, name: string, desc: string, blurb = "") {
    this.sym(SymbolType.sub, addr, name, desc, blurb);
  }

  reg(addr: Addr, name: string, desc: string, blurb = "") {
    this.sym(SymbolType.reg, addr, name, desc, blurb);
  }

  sym(sType: SymbolType, addr: Addr, name: string, desc: string, blurb = "") {
    if (addr < 0 || addr >= 1 << 16) {
      throw Error("address out of range");
    }
    name = name.trim();
    if (name.length < 1) {
      throw Error("name empty");
    }
    if (this.addressToSymbol.has(addr) || this.nameToSymbol.has(name)) {
      // TODO should support multiple symbols at same address
      throw Error(`${this.name}: non-unique address (${addr}) or name (${name})`);
    }
    const symDef = new SymDef(sType, name, addr, desc.trim(), blurb.trim());
    this.addressToSymbol.set(addr, symDef);
    this.nameToSymbol.set(name, symDef);
  }

  // noinspection JSUnusedGlobalSymbols
  byName(name: string) {
    return this.nameToSymbol.get(name);
  }

  byAddress(addr: Addr) {
    return this.addressToSymbol.get(addr);
  }
}

const mkLabels = (labels: string[] | string) => new LabelsComments(labels);
const mkComments = (comments: string[] | string) => new LabelsComments([], comments);

/**
 * A collection of labels and comments.
 */
export class LabelsComments {

  static EMPTY = new LabelsComments();

  private readonly _labels: string[];
  private readonly _comments: string[];

  constructor(labels: string[] | string = [], comments: string[] | string = []) {
    this._labels = toStringArray(labels);
    this._comments = toStringArray(comments);
  }

  get labels() {
    return this._labels
  }

  get comments() {
    return this._comments;
  }

  longestLabel = () => this.labels.map(s => s.length).reduce((p, c) => p > c ? p : c);

  addLabels(labels: string[] | string): void {
    toStringArray(labels).forEach(s => this._labels.push(s));
  }

  addComments(comments: string[] | string): void {
    toStringArray(comments).forEach(s => this._comments.push(s));
  }

  /**
   * Mutates this by adding all the given labels and comments, returns this.
   */
  merge(lc: LabelsComments): LabelsComments {
    this.addLabels(lc._labels);
    this.addComments(lc._comments);
    return this;
  }

  /**
   * Total number of labels plus comments.
   */
  length() {
    return this._comments.length + this._labels.length;
  }
}

/**
 * Given a binary, returns an array of Addr, LabelsComments tuples representing
 * destinations for jump or branch. Addr is derived from the contents of the
 * {@link FileBlob}.
 */
type SymbolResolver = (fb: FileBlob) => Array<[Addr, LabelsComments]>;

const EMPTY_JUMP_TARGET_FETCHER: SymbolResolver = (_fb) => []

export {
  Environment,
  Section,
  SectionType,
  mkLabels,
  mkComments,
  SymbolTable,
  SourceType,
  SymbolType,
  EMPTY_JUMP_TARGET_FETCHER
};
export type {
  SymbolResolver
};