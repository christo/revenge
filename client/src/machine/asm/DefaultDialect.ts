import {Dialect} from "./Dialect.ts";
import {
  BooBoo,
  Tag,
  TAG_ABSOLUTE,
  TAG_ADDRESS,
  TAG_CODE,
  TAG_COMMENT,
  TAG_DATA,
  TAG_HEXARRAY,
  TAG_IN_BINARY,
  TAG_KEYWORD,
  TAG_LABEL,
  TAG_MNEMONIC,
  TAG_OPERAND,
  TAG_OPERAND_VALUE
} from "../api.ts";
import {Byteable, hex16, hex8, TODO, unToSigned} from "../core.ts";
import {
  FullInstruction,
  MODE_ABSOLUTE,
  MODE_ABSOLUTE_X,
  MODE_ABSOLUTE_Y,
  MODE_ACCUMULATOR,
  MODE_IMMEDIATE,
  MODE_IMPLIED,
  MODE_INDIRECT,
  MODE_INDIRECT_X,
  MODE_INDIRECT_Y,
  MODE_RELATIVE,
  MODE_ZEROPAGE,
  MODE_ZEROPAGE_X,
  MODE_ZEROPAGE_Y
} from "../mos6502.ts";
import {Environment, LabelsComments, tagText} from "./asm.ts";
import {
  BLANK_LINE,
  Directive,
  FullInstructionLine,
  InstructionLike,
  LabelsCommentsOnly,
  PcAssign
} from "./instructions.ts";
import {Disassembler} from "./Disassembler.ts";

/**
 * Represents the state of a line-based parser
 */
enum ParserState {
  READY,
  MID_MULTILINE_COMMENT,
}

/**
 * Need to support options, possibly at specific memory locations.
 * Global option may be lowercase opcodes.
 * Location-specific option might be arbitrary label, decimal operand, lo-byte selector "<" etc.
 * Some assembler dialects have other ways of rendering addressing modes (e.g. suffix on mnemonic).
 * Can support use of symbols instead of numbers - user may prefer to autolabel kernal addresses.
 */
class DefaultDialect implements Dialect {
  private static readonly KW_BYTE_DECLARATION: string = '.byte';
  private static readonly KW_WORD_DECLARATION: string = '.word';
  private readonly _env: Environment;

  constructor(env: Environment) {
    this._env = env;
  }

  get name(): string {
    return "Default MOS 6502";
  }

  get env(): Environment {
    return this._env;
  }

  multilineCommentDelimiters(): [string, string] {
    return ["/*", "*/"];
  }

  parseLine(line: string, parserState: ParserState): [InstructionLike, ParserState] {
    // work in progres - assembler
    if (parserState === ParserState.READY) {
      // LINE_BEGIN [label] [instruction | directive] [comment] LINE_END
      const m = line.match(`^([A-Za-z_]\w*:)?\h*()?\h*(\\\*.*\*/|;.*)$`)
      if (m) {
        const label = m[1];
        const instruction = m[2];
        const comment = m[3];
        console.log(`label: ${label} instruction:${instruction} comment:${comment}`);
        throw new Error("unimplemented");
      } else {
        throw new Error("parse error");
      }
    } else if (parserState === ParserState.MID_MULTILINE_COMMENT) {
      if (line.match(`^\h*\*/\h*$`)) {
        // only end of comment
        return [BLANK_LINE, ParserState.READY];
      } else {
        // is this the last comment line?
        const m = line.match(`^(.*)\*/\h*$`);
        if (m) {
          return [new LabelsCommentsOnly(new LabelsComments([], m[1])), ParserState.READY];
        } else {
          return [new LabelsCommentsOnly(new LabelsComments([], line.trim())), ParserState.MID_MULTILINE_COMMENT];
        }
      }
    } else {
      throw new Error(`unknown parser state: ${parserState}`);
    }
  }

  checkLabel(l: string): BooBoo[] {
    // future: some assemblers insist labels must not equal/start-with/contain a mnemonic
    const regExpMatchArrays = l.matchAll(/(^\d|\s)/g);
    if (regExpMatchArrays) {
      return [new BooBoo(`Label must not start with digit or contain whitespace: ${l}`)];
    } else {
      return [];
    }
  }

  lineCommentPrefix() {
    return ["; "];
  }

  formatLabel(s: string) {
    return s + ": ";
  }

  hexByteText(b: number) {
    return "$" + hex8(b);
  }

  hexWordText(x: number) {
    return "$" + hex16(x);
  }

  bytes(x: FullInstructionLine, _dis: Disassembler): Tag[] {
    // future: context may give us rules about grouping, pattern detection etc.
    const comments: Tag = new Tag(TAG_COMMENT, this.renderComments(x.labelsComments.comments));
    const labels: Tag = new Tag(TAG_LABEL, this.renderLabels(x.labelsComments.labels));
    const data: Tag = new Tag(TAG_DATA, this._env.indent() + tagText(this.byteDeclaration(x)));
    return [comments, labels, data];
  }

  words(words: number[], lc: LabelsComments, _dis: Disassembler): Tag[] {
    const comments: Tag = new Tag(TAG_COMMENT, this.renderComments(lc.comments));
    const labels: Tag = new Tag(TAG_LABEL, this.renderLabels(lc.labels));
    const tags: Tag[] = this.wordDeclaration(words)
    const data: Tag = new Tag(TAG_DATA, this._env.indent() + tagText(tags));
    return [comments, labels, data];
  }

  /**
   * Makes {@link Tag Tags} for the given FullInstructionLine consisting of
   * comments, labels and the executable part of the code.
   *
   * @param fil the FullInstructionLine
   * @param dis the Disassembler
   */
  code(fil: FullInstructionLine, dis: Disassembler): Tag[] {
    const comments: Tag = new Tag(TAG_COMMENT, this.renderComments(fil.labelsComments.comments));
    const labels: Tag = new Tag(TAG_LABEL, this.renderLabels(fil.labelsComments.labels));
    return [comments, labels, ...this.taggedCode(fil, dis)];
  }

  directive(_directive: Directive, _dis: Disassembler): Tag[] {
    TODO();
    return [];
  }

  pcAssign(pcAssign: PcAssign, _dis: Disassembler): Tag[] {
    const comments = new Tag(TAG_COMMENT, this.renderComments(pcAssign.labelsComments.comments));
    const labels = new Tag(TAG_LABEL, this.renderLabels(pcAssign.labelsComments.labels));
    const pc = new Tag(TAG_CODE, "* =");
    const addr = new Tag([TAG_ABSOLUTE, TAG_OPERAND], this.hexWordText(pcAssign.address));
    const dummy = new Tag(TAG_ADDRESS, "_");
    return [comments, labels, dummy, pc, addr];
  }

  labelsComments(labelsComments: LabelsComments, _dis: Disassembler): Tag[] {
    const labels: Tag = new Tag(TAG_LABEL, this.renderLabels(labelsComments.labels));
    const comments: Tag = new Tag(TAG_COMMENT, this.renderComments(labelsComments.comments));
    return [comments, labels];
  }

  /**
   * Create Tags for just the code of the given FullInstructionLine
   * consisting of the mnemonic and, if present, the operand.
   *
   * @param fil the FullInstructionLine
   * @param dis the Disassembler
   * @private
   */
  private taggedCode(fil: FullInstructionLine, dis: Disassembler): Tag[] {
    // add the mnemonic tag and also the mnemonic category
    const mi = fil.fullInstruction.instruction;
    const mnemonic: Tag = new Tag([TAG_MNEMONIC, mi.op.cat], mi.op.mnemonic.toLowerCase());
    const operandText = this.renderOperand(fil.fullInstruction, dis).trim();
    // check the symbol table for a symbol that matches this operand
    if (operandText.length > 0) {
      const operandTag = new Tag([TAG_OPERAND, mi.mode.code], operandText);
      if (fil.fullInstruction.staticallyResolvableOperand()) {
        const opnd = fil.fullInstruction.operandValue();
        // future: check other addressing modes
        // check if the operand is an address inside the binary
        if (fil.fullInstruction.instruction.mode === MODE_ABSOLUTE && dis.isInBinary(opnd)) {
          operandTag.tags.push(TAG_IN_BINARY)
        }
        // add operand hex value as data so front-end can always extract it
        operandTag.data = [[TAG_OPERAND_VALUE, hex16(opnd)]];
      }
      return [mnemonic, operandTag];
    } else {
      return [mnemonic];
    }
  }

  private renderLabels(labels: string[]): string {
    const le = this._env.targetLineEndings();
    return labels.map(s => this.formatLabel(s)).join(le);
  }

  private renderComments(comments: string[]): string {
    const le = this._env.targetLineEndings();
    const cp = this.lineCommentPrefix();
    // transform all lines in the comment to line comments
    return comments.map(c => cp + c.replaceAll(le, le + cp)).join("");
  }

  /**
   * Creates byte declaration source for the given byteable.
   *
   * @param b
   * @private
   */
  private byteDeclaration(b: Byteable): Tag[] {
    if (b.getLength() === 0) {
      throw Error("not entirely sure how to declare zero bytes");
    }
    const kw: Tag = new Tag(TAG_KEYWORD, DefaultDialect.KW_BYTE_DECLARATION);
    const hexTag = new Tag(TAG_HEXARRAY, b.getBytes().map(this.hexByteText).join(", "));
    return [kw, hexTag];
  }

  private wordDeclaration(words: number[]): Tag[] {
    const kw: Tag = new Tag(TAG_KEYWORD, DefaultDialect.KW_WORD_DECLARATION);
    const values: Tag = new Tag(TAG_HEXARRAY, words.map(this.hexWordText).join(", "));
    return [kw, values];
  }

  /**
   * Returns only the operand portion, trimmed.
   * @param il
   * @param dis
   * @private
   */
  private renderOperand(il: FullInstruction, dis: Disassembler): string {

    let operand = "";
    switch (il.instruction.mode) {
      case MODE_ACCUMULATOR:
        // operand = "a"; // in some weird dialects this may be so
        operand = ""; // implied accumulator not manifest
        break;
      case MODE_ABSOLUTE:
        const x = il.operand16();
        const symbol = dis.getSymbol(x);
        if (symbol !== undefined) {
          operand = symbol.name;
          dis.addSymbolDefinition(symbol);
          dis.addStat("symbol definition");
        } else {
          operand = this.hexWordText(x);
        }
        break;
      case MODE_ABSOLUTE_X:
        operand = this.hexWordText(il.operand16()) + ", x";
        break;
      case MODE_ABSOLUTE_Y:
        operand = this.hexWordText(il.operand16()) + ", y";
        break;
      case MODE_IMMEDIATE:
        operand = "#" + this.hexByteText(il.firstByte);
        break;
      case MODE_IMPLIED:
        operand = "";
        break;
      case MODE_INDIRECT:
        operand = "(" + this.hexWordText(il.operand16()) + ")";
        break;
      case MODE_INDIRECT_X:
        operand = "(" + this.hexByteText(il.firstByte) + ", x)";
        break;
      case MODE_INDIRECT_Y:
        operand = "(" + this.hexByteText(il.firstByte) + "), y";
        break;
      case MODE_RELATIVE:
        // render decimal two's complement 8-bit
        operand = unToSigned(il.firstByte).toString(10);
        break;
      case MODE_ZEROPAGE:
        operand = this.hexByteText(il.firstByte);
        break;
      case MODE_ZEROPAGE_X:
        operand = this.hexByteText(il.firstByte) + ", x"
        break;
      case MODE_ZEROPAGE_Y:
        operand = this.hexByteText(il.firstByte) + ", y"
        break;
    }
    return operand;
  }
}

export {DefaultDialect, ParserState};