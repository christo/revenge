import {BooBoo, Tag} from "../api.ts";
import {Environment, LabelsComments} from "./asm.ts";
import {ParserState} from "./DefaultDialect.ts";
import {Disassembler} from "./Disassembler.ts";
import {Directive, FullInstructionLine, InstructionLike, PcAssign, SymbolDefinition} from "./instructions.ts";

/**
 * Abstraction for holding syntactic specifications and implementing textual renditions of
 * assembly language.
 *
 */
interface Dialect {
  readonly name: string;
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
   * TODO how to implement "unsupported" or multiple alternatives (like kickass)
   */
  multilineCommentDelimiters(): [string, string];

  /**
   * Format the given string as a label. For example adding a trailing colon that must be present but which
   * is not part of the label name.
   * @param s
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

export type {Dialect};