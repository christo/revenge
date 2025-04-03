import {BooBoo, Tag, TAG_COMMENT, TAG_LABEL} from "../api.ts";
import {Environment, LabelsComments} from "./asm.ts";
import {Disassembler} from "./Disassembler.ts";
import {Directive, FullInstructionLine, InstructionLike, PcAssign, SymbolDefinition} from "./instructions.ts";
import {ParserState} from "./RevengeDialect.ts";

export const C_COMMENT_MULTILINE: [string, string] = ["/*", "*/"];
export const SEMICOLON_PREFIX = ["; "];

/**
 * Abstraction for holding syntactic specifications and implementing textual renditions of
 * assembly language.
 *
 */
interface Dialect {
  readonly name: string;
  readonly description: string;
  readonly env: Environment;

  parseLine(line: string, parserState: ParserState): [InstructionLike, ParserState];

  /**
   * Check that the given label conforms to the rules for labels, returning a possibly empty array of
   * errors.
   *
   * @param label the label to check for syntactic validity.
   */
  checkLabel(label: string): BooBoo[];

  /**
   * Return all strings that signal comment to end of line.
   */
  lineCommentPrefix(): string[];

  /**
   * Return the start and end strings for multiline comments.
   * If not supported, return undefined.
   */
  multilineCommentDelimiters(): [string, string] | undefined;

  /**
   * Format the given string as a label. For example adding a trailing colon that must be present but which
   * is not part of the label name.
   * @param s the label name
   * @return label declaration syntax
   */
  formatLabel(s: string): string;

  /**
   * Render tagged code disassembly for this dialect for the given line.
   *
   * @param fullInstructionLine one logical line of disassembly.
   * @param dis the disassembly state.
   */
  code(fullInstructionLine: FullInstructionLine, dis: Disassembler): Tag[];

  /**
   * Render tagged byte declaration.
   *
   * @param byteable supplies the bytes to be declared as bytes.
   * @param dis the disassembly state.
   */
  bytes(byteable: Directive | FullInstructionLine, dis: Disassembler): Tag[];

  /**
   * Special form of byte declaration specifying with a string literal in configured encoding.
   * Typically rendered in quotes.
   *
   * @param byteable
   * @param dis
   */
  text(byteable: Directive | FullInstructionLine, dis: Disassembler): Tag[];

  /**
   * Render the given values as 16 bit words. If there is an odd number of bytes, the last will be forced to be
   * a byte definition.
   *
   * @param words array of word values, weighing two bytes each.
   * @param lc labels and comments
   * @param dis the disassembly context.
   */
  words(words: number[], lc: LabelsComments, dis: Disassembler): Tag[];

  /**
   * Render tagged directive.
   *
   * @param directive the assembler directive
   * @param dis the disassembly state.
   */
  directive(directive: Directive, dis: Disassembler): Tag[];

  /**
   * PC Assignment, special case directive. Typical variations include:
   * ORG $abcd
   * * = $abcd
   * Also renders comments and labels
   * @param pcAssign
   * @param dis
   */
  pcAssign(pcAssign: PcAssign, dis: Disassembler): Tag[];

  symbolDefinition(symDef: SymbolDefinition, dis: Disassembler): Tag[];

  labelsComments(labelsComments: LabelsComments, dis: Disassembler): Tag[];

  /**
   * Return the source string for the given byte as a hex literal.
   * @param b
   */
  hexByteText(b: number): string;

  /**
   * Return the source string for the given word as a hex literal.
   * @param x
   */
  hexWordText(x: number): string;
}

abstract class BaseDialect implements Dialect {
  readonly name: string;
  readonly description: string;
  readonly env: Environment;

  constructor(name: string, description: string, env: Environment) {
    this.name = name;
    this.description = description;
    this.env = env;
  }

  abstract bytes(byteable: FullInstructionLine | Directive, dis: Disassembler): Tag[];

  /**
   * Popular label rule; no whitespace and must start with a non-digit
   * @param l
   */
  checkLabel(l: string): BooBoo[] {
    // future: some assemblers insist labels must not equal/start-with/contain a mnemonic
    // TODO should restrict label characters more than this
    const match = l.matchAll(/(^\d|\s)/g);
    if (match) {
      return [new BooBoo(`Label must not start with digit or contain whitespace: ${l}`)];
    } else {
      return [];
    }
  }

  abstract code(fullInstructionLine: FullInstructionLine, dis: Disassembler): Tag[];

  abstract directive(directive: Directive, dis: Disassembler): Tag[];

  abstract formatLabel(s: string): string;

  abstract hexByteText(b: number): string;

  abstract hexWordText(x: number): string;

  abstract lineCommentPrefix(): string[];

  abstract multilineCommentDelimiters(): [string, string] | undefined;

  abstract parseLine(line: string, parserState: ParserState): [InstructionLike, ParserState];

  abstract pcAssign(pcAssign: PcAssign, dis: Disassembler): Tag[];

  abstract symbolDefinition(symDef: SymbolDefinition, dis: Disassembler): Tag[];

  abstract text(byteable: Directive | FullInstructionLine, dis: Disassembler): Tag[];

  abstract words(words: number[], lc: LabelsComments, dis: Disassembler): Tag[];


  renderLabels(labels: string[]): string {
    const le = this.env.targetLineEndings();
    return labels.map(s => this.formatLabel(s)).join(le);
  }

  renderComments(comments: string[]): string {
    const le = this.env.targetLineEndings();
    const cp = this.lineCommentPrefix();
    // transform all lines in the comment to line comments
    // TODO handle multiline comments once comment-only source lines are supported
    return comments.map(c => cp + c.replaceAll(le, le + cp)).join("");
  }


  labelsComments(labelsComments: LabelsComments, _dis: Disassembler): Tag[] {
    const labels: Tag = new Tag([TAG_LABEL], this.renderLabels(labelsComments.labels));
    const comments: Tag = new Tag([TAG_COMMENT], this.renderComments(labelsComments.comments));
    return [comments, labels];
  }
}

export {type Dialect, BaseDialect};
