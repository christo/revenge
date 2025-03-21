import {Detail} from "../ui/Detail.ts";
import {TagRenderer} from "../ui/TagRenderer.ts";
import {InstructionLike} from "./asm/instructions.ts";
import {BlobSniffer} from "./BlobSniffer.ts";
import {Addr, BigEndian, hex8, LittleEndian} from "./core";
import {DataView, DataViewImpl} from "./DataView.ts";
import {FileBlob} from "./FileBlob";
import {Memory} from "./Memory.ts";
import {Mos6502} from "./mos6502";

function getRenderers(_tag: Tag): TagRenderer[] {
  // TODO implement this
  return [];
}

/**
 * Renderable output of structured text with html-friendly structure and internal text renderer.
 * A sequence of string tuples that represent a name-value pair that will be rendered with
 * the name as a className and the value as the text content of a span element.
 *
 * TODO kill this crazy idea via migration to "TagRenderer"
 */
class Tag {

  classNames: string[];
  id: string | undefined;
  data: [string, string][];
  value: string;

  constructor(tags: string[], value: string, data: [string, string][] = [], id: string | undefined = undefined) {
    this.classNames = tags;
    this.id = id;
    this.data = data;
    this.value = value;
  }

  hasTag = (s: string) => this.classNames.includes(s);

  /**
   * These are currently used to generate class name lists for styling.
   * @deprecated migrate to TagRenderer system
   */
  spacedClassNames = () => this.classNames.join(" ");

  hasTags = (ts: string[]) => ts.every((t) => this.classNames.includes(t));
}

export class HexTag extends Tag {

  constructor(value: string, data: [string, string][] = [], id: string | undefined = undefined) {
    super([TAG_HEXBYTE], value, data, id);
  }
}

export class KeywordTag extends Tag {

  constructor(value: string) {
    super([TAG_KEYWORD], value, [], undefined);
  }
}

// tag values representing css classes in DetailView

export const TAG_IN_BINARY = "inbinary";

/** a label in the source code */
export const TAG_LABEL = "label";

/** a human readable comment */
export const TAG_COMMENT = "comment";
export const TAG_DATA = "data";

/** an instruction operand */
export const TAG_OPERAND = "opnd";
/** operand in absolute addressing mode is */
export const TAG_ABSOLUTE = "abs";

/** an address */
export const TAG_ADDRESS = "addr";
/** instruction that was executed during trace */
export const TAG_EXECUTED = "executed";
/** in base 16 */
export const TAG_HEX = "hex";
/** every logical line */
export const TAG_LINE = "line";
/** line number in basic */
export const TAG_LINE_NUM = "lnum";
/** displays an info/warning message instead of a content line */
export const TAG_NOTE = "note";
export const TAG_KEYWORD = 'kw';
export const TAG_HEXARRAY = "hexarray";
/** displays a literal text string such as in assembly source */
export const TAG_PETSCII = "tlit";
/** generic class of assembly source expressions */
export const TAG_CODE = "code";
/** assembly mnemonic */
export const TAG_MNEMONIC = "mn";
/** the right hand side of a machine instruction or assembler directive */
export const TAG_OPERAND_VALUE = "opnd_val";
/** single byte as hex digit pair */
export const TAG_HEXBYTE = "hexbyte";
/** entire hex dump */
export const TAG_HEXBYTES = "hexbytes";

/**
 * Holds a logical line of source with its address and the {@link InstructionLike}. Need to be bidirectionally mapped to
 * addresses and yet also we want to generate listings where there are lines that have no address, but they do usually
 * belong in a specific place in the listing. Macro definitions, for example, need to exist in the listing, but they
 * have no address location and could be reordered so long as they adhere to dialect-enforced-rules about forward
 * references inherited from assemblers.
 *
 * The mapping between addresses and source lines is bijective:
 *
 * - every byte corresponds to some component of a source line
 * - multiple source can be located between/before a given address (e.g. macro definitions, comments, labels)
 * - every byte has a unique address
 * - a source line can map to zero or more bytes
 * - instructions have variable byte length correspondence, so alternative instructions (e.g. code vs data) will
 * consume different numbers of bytes. Changing from an insruction to a byte definition may have a knock-on effect
 * that forces a different interpretation of following bytes.
 * - Edicts produce these knock on effects, although they're defined at offsets rather than addresses
 * - can have comments and no instructions
 * - can have labels but if it has a label it needs address
 * - labels are different to symbol assignment - label has an implicit "= *"
 *
 */
class LogicalLine {

  private readonly tags: Tag[];
  private readonly address: Addr | undefined;
  private readonly instruction?: InstructionLike;

  constructor(tags: Tag[], address: Addr | undefined, instruction?: InstructionLike) {
    this.tags = tags;
    this.address = address;
    this.instruction = instruction;
  }

  getTags(): Tag[] {
    return this.tags;
  }

}

/**
 * Main function for generating the file detail.
 */
type ActionExecutor = () => Detail;

// noinspection JSUnusedGlobalSymbols
/** A type for handling the result of a UserAction execution */
type Continuation = (fo: ActionExecutor) => void;

/** Holds the UI button label and function to call when the button is clicked */
type UserAction = { label: string, f: ActionExecutor };

/**
 * User action for a fileblob
 */
type UserFileAction = (fb: FileBlob) => UserAction;

/**
 * Holds the sniffer and the set of actions that can be taken for this type. At least one action required.
 */
type TypeActions = { t: BlobSniffer, actions: [UserAction, ...UserAction[]] };

/**
 * Encapsulation of the function for determining the set of actions that can be taken
 * given knowledge of the type and contents of a file.
 */
type ActionFunction = (t: BlobSniffer, fb: FileBlob) => TypeActions;

/** Function that produces TypeActions with only a {@link FileBlob}. */
type BlobToActions = (fileBlob: FileBlob) => TypeActions;

/**
 * Error class for user-reportable problems, all the sensible names have been domain squatted by typescript/javascript.
 */
class BooBoo {
  readonly mesg: string;

  constructor(mesg: string) {
    this.mesg = mesg;
  }
}


/**
 * Shows a hex dump for a {@link FileBlob}
 * @param fb
 */
const hexDumper: UserFileAction = (fb: FileBlob) => ({
  label: "Hex Dump",
  f: () => {
    // TODO make hex dump have n bytes per line with addresses at beginning of each;
    //  currently whole hex dump is a single logical line at no address with no instruction
    // add the classes for hex dump as a whole and for each byte
    const allData = fb.getBytes().map(x => new HexTag(hex8(x)));
    const lls = [allData].map((ts: Tag[], i: number) => new LogicalLine(ts, i));
    const newDataView: DataView = new DataViewImpl(lls);
    return new Detail("Hex Dump", [TAG_HEXBYTES], newDataView);
  }
});

/**
 * Available memory, basic load addres etc.
 */
class MemoryConfiguration {
  readonly name: string;
  readonly basicStart: Addr;

  /**
   * A short UI string that uniquely annotates this memory configuration. In the case of C64 standard memory
   * configuration, this can be empty. Does not need to include any machine identifier.
   */
  readonly shortName: string;

  /**
   * Create a memory configuration.
   *
   * @param name for display
   * @param basicStart 16 bit address where BASIC programs are loaded
   * @param shortName short designation for UI
   */
  constructor(name: string, basicStart: Addr, shortName = "") {
    // future: various independent block configurations
    this.name = name;
    this.basicStart = basicStart;
    this.shortName = shortName;
  }
}

abstract class Computer {
  private _memory: Memory<BigEndian | LittleEndian>;
  private readonly _memoryConfig: MemoryConfiguration;
  private readonly _name: string;
  private readonly _tags: string[];
  private readonly _cpu: Mos6502;

  protected constructor(
      name: string,
      cpu: Mos6502,
      memory: Memory<BigEndian | LittleEndian>,
      memoryConfig: MemoryConfiguration,
      tags: string[]) {
    this._name = name;
    this._cpu = cpu;
    this._memory = memory;
    this._memoryConfig = memoryConfig;
    this._tags = tags;
  }

  get cpu() {
    return this._cpu;
  }

  memory() {
    return this._memoryConfig;
  }

  name() {
    return this._name;
  }

  // noinspection JSUnusedGlobalSymbols
  tags() {
    return this._tags;
  }

  pushWordBytes(ba: number[], word: number) {
    return this._memory.endianness().pushWordBytes(ba, word);
  }
}

export {BooBoo, hexDumper, Tag, LogicalLine, MemoryConfiguration, Computer};
export type {
  ActionExecutor,
  BlobToActions,
  ActionFunction,
  UserAction,
  TypeActions,
  Continuation
};