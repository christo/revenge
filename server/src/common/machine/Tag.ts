import {MODE_INDIRECT} from "./mos6502.js";

/** operand in absolute addressing mode is */
export const TAG_ABSOLUTE = "abs";

/** an instruction operand */
export const TAG_OPERAND = "opnd";
/** an address */
export const TAG_ADDRESS = "addr";

/** the address was written to */
export const TAG_ADDRESS_WAS_WRITTEN = "waswritten";

export const TAG_DATA = "data";
/** there is no address for this line */
export const TAG_NO_ADDRESS = "noaddr";
/** instruction that was executed during trace */
export const TAG_EXECUTED = "executed";
/** a declared start of execution */
export const TAG_ENTRY_POINT = "entrypoint";
/** in base 16 */
export const TAG_HEX = "hex";
export const TAG_HEXARRAY = "hexarray";
export const TAG_DECIMAL_ARRAY = "decarray";
/** displays a literal text string such as in assembly source */
export const TAG_PETSCII = "tlit";
/** generic class of assembly source expressions */
export const TAG_CODE = "code";
/** entire hex dump */
export const TAG_HEXBYTES = "hexbytes";
/**
 * an operand address that is inside the range occupied by this binary
 */
export const TAG_IN_BINARY = "inbinary";

/** definition of a symbol */
export const TAG_SYM_DEF = "symdef";
/** assembly mnemonic */
export const TAG_MNEMONIC = "mn";
/** the right hand side of a machine instruction or assembler directive */
export const TAG_OPERAND_VALUE = "opnd_val";

/** a defined symbol */
export const TAG_KNOWN_SYMBOL = "knownsymbol"
/** displays an info/warning message instead of a content line */
export const TAG_NOTE = "note";

/** line number in basic */
export const TAG_LINE_NUM = "lnum";

/** every logical line */
export const TAG_LINE = "line";

/** the address was read from */
export const TAG_ADDRESS_WAS_READ = "wasread";

export const TAG_BLANK = "blank";

/** a keyword in source code */
export const TAG_KEYWORD = 'kw';

/** single byte as hex digit pair */
export const TAG_HEXBYTE = "hexbyte";

/** the name of a symbol */
export const TAG_SYMNAME = `symname`;

export const TAG_DYNAMIC = 'dynamic';

/**
 * Usage descriptor for a symbol.
 */
export const TAG_SYMBLURB = `symblurb`;

export const TAG_RELATIVE = "rel";

/** a label in the source code */
export const TAG_LABEL = "label";
/** a human readable comment */
export const TAG_COMMENT = "comment";

/**
 * Renderable output of structured text with html-friendly structure and internal text renderer.
 * A sequence of string tuples that represent a name-value pair that will be rendered with
 * the name as a className and the value as the text content of a span element.
 *
 * Represents a fine-grained view component correlated by css classes.
 *
 * TODO kill this crazy Tag idea
 *   it's an overly desperate attempt to not use tsx by holding a fence-sitting abstraction that is
 *   ultimately just hard to use - it would be more ergonomic to have separate front-end components
 *   for semantically rich front-end rendering. This gets in the way of that. Introduce api with
 *   types and methods for dispatching to the correct component.
 */
class Tag {

  readonly classNames: string[];
  readonly data: [string, string][];
  readonly value: string;
  private readonly id: string | undefined;

  constructor(tags: string[], value: string, data: [string, string][] = [], id: string | undefined = undefined) {
    this.classNames = tags;
    this.id = id;
    this.data = data;
    this.value = value;
  }

  /**
   * These are currently used to generate class name lists for styling.
   * @deprecated migrate to TagRenderer system
   */
  spacedClassNames = () => this.classNames.join(" ");

  isOperandResolvingToInternalAddress = () => {
    const cns = this.classNames;
    return cns.includes(TAG_OPERAND) && (cns.includes(TAG_ABSOLUTE) || cns.includes(TAG_RELATIVE)) && cns.includes(TAG_IN_BINARY);
  }

  isLine = () => this.classNames.includes(TAG_LINE);

  isLineNumber = () => this.classNames.includes(TAG_LINE_NUM);

  isAddress = () => this.classNames.includes(TAG_ADDRESS);

  isKnownSymbol = () => this.classNames.includes(TAG_KNOWN_SYMBOL);

  isSymbolDef = () => this.classNames.includes(TAG_SYM_DEF);

  isNote = () => this.classNames.includes(TAG_NOTE);

  isIndirectMode = () => {
    return this.classNames.includes(MODE_INDIRECT.code)
        || this.classNames.includes(MODE_INDIRECT_X.code)
        || this.classNames.includes(MODE_INDIRECT_Y.code);
  };

  wasWrittenTo = () => this.classNames.includes(TAG_ADDRESS_WAS_WRITTEN);
  wasReadFrom = () => this.classNames.includes(TAG_ADDRESS_WAS_READ);

  toString(): string {
    return `Tag[classes=[${this.classNames.join(",")}],value=${this.value}]`
  }
}

export {Tag};


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
