import {Byteable} from "../../../../server/src/common/Byteable.ts";
import {
  KeywordTag,
  Tag,
  TAG_ABSOLUTE,
  TAG_CODE,
  TAG_COMMENT,
  TAG_DATA,
  TAG_DECIMAL_ARRAY,
  TAG_HEXARRAY,
  TAG_IN_BINARY,
  TAG_KNOWN_SYMBOL,
  TAG_LABEL,
  TAG_MNEMONIC,
  TAG_NO_ADDRESS,
  TAG_OPERAND,
  TAG_OPERAND_VALUE,
  TAG_PETSCII,
  TAG_SYM_DEF
} from "../api.ts";
import {Petscii} from "../cbm/petscii.ts";
import {hex16, hex8, unToSigned} from "../../../../server/src/common/machine/core.ts";
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
import {Environment, LabelsComments} from "./asm.ts";
import {Emitter, emitThis, errorEmitter, instructionEmitter} from "./Assembler.ts";
import {AssemblyMeta} from "./AssemblyMeta.ts";
import {BaseDialect, C_COMMENT_MULTILINE, Dialect, SEMICOLON_PREFIX} from "./Dialect.ts";
import {Directive} from "./Directive.ts";
import {Disassembler} from "./Disassembler.ts";
import {FullInstructionLine, PcAssign, SymbolDefinition} from "./instructions.ts";
import {LiteralOperand} from "./LiteralOperand.ts";
import {OperandResolver} from "./OperandResolver.ts";
import {ParserState} from "./ParserState.ts";
import {SymbolLookup} from "./SymbolLookup.ts";

/**
 * Turns a tagSeq into plain text, discarding the tags.
 *
 * @param ts
 */
const tagText = (ts: Tag[]) => ts.map(t => t.value).join(" ");

/**
 * Homebrew 6502 dialect with modern conventional idioms.
 * Global option may be lowercase opcodes.
 * Location-specific option might be arbitrary label, decimal operand, lo-byte selector "<" etc.
 * Some assembler dialects have other ways of rendering addressing modes (e.g. suffix on mnemonic).
 * Can support use of symbols instead of numbers - user may prefer to autolabel kernal addresses.
 */
class RevengeDialect extends BaseDialect implements Dialect {
  private static readonly KW_BYTE_DECLARATION: string = '.byte';
  private static readonly KW_WORD_DECLARATION: string = '.word';
  private static readonly KW_TEXT_DECLARATION: string = '.text';

  constructor(env: Environment = Environment.DEFAULT_ENV) {
    super(
        "Revenge MOS 6502",
        "Vaguely standard modern syntax with commonly supported features.",
        env
    );
  }

  multilineCommentDelimiters(): [string, string] {
    return C_COMMENT_MULTILINE;
  }

  parseInstructionPart(s: string, am: AssemblyMeta) {
    /*
      parse instruction of form MNEMONIC OPERAND
      where:
        MNEMONIC is 3 alpha chars
        OPERAND is either:
          $hh (two digit hex implying zero page mode)
          $hhhh (four digit hex implying absolute mode)
          d..d decimal digits (<256 implies zero page, 256-65535 implies absolute)
          label word chars implying symbol lookup which defers operand and mode resolution
    */
    // TODO does not do indirect yet
    const r = s.match(/([A-Za-z]{3})\s(#)?(\$[A-Fa-f0-9]{2,4}|[A-Za-z]\w*)\s*((,)\s*([xy]))?/);
    if (r) {
      const mnemonic = r[1];
      const immFlag = r[2];
      const operand = r[3];
      const comma = r[4];
      const indexReg = r[5];
      console.log(`mnemonic: ${mnemonic}`);
      console.log(`immFlag: ${immFlag}`);
      console.log(`operand: ${operand}`);
      console.log(`comma: ${comma}`);
      console.log(`indexReg: ${indexReg}`);
      if (mnemonic) {
        if (operand) {
          if (immFlag) {
            throw Error("unimplemented immediate mnemonic");
          } else if (comma && indexReg) {
            throw Error(`unmplemented indexed addressing mode`)
          } else {
            console.log("got mnemonic and operand");
            // look up the mnemonic by name and mode
            const resolver = this.parseOperand(operand, am);
            if (!resolver) {
              return errorEmitter(`Cannot parse operand ${operand}`);
            } else {
              return instructionEmitter(mnemonic, resolver);
            }
          }
        } else {
          // no operand
          throw Error("unimplemented niladic mnemonics");
        }
      } else {
        return errorEmitter(`cannot find mnemonic`);
      }
    } else {
      return errorEmitter(`cannot parse instruction ${s}`);
    }
  }

  parseLine(line: string, parserState: ParserState, am: AssemblyMeta): Emitter[] {
    // work in progres - assembler

    if (parserState.state === "READY") {
      // LINE_BEGIN [label] [instruction | directive] [comment] LINE_END
      // TODO add unit test to be sure of wtf
      const m = line.match(/^([A-Za-z_]\w*:)?\s*(.*)\s*(\*.*\*\/|;.*)?$/)
      if (m) {
        const label = m[1];
        const instruction = m[2];
        const comment = m[3];
        // const inst = this.parseInstructionPart(m[2], parserState.symbolTable);
        const e = this.parseInstructionPart(instruction, am);
        console.log(`*****   label: ${label} instruction:${instruction} comment:${comment}`);
        if (!e) {
          console.error("undefined emitter!");
        }
        return e ? [e] : [];
      } else {
        throw new Error(`parse error: ${line}`);
      }
    } else if (parserState.state === "MID_MULTILINE_COMMENT") {
      // TODO add unit test to be sure of wtf
      if (line.match(/^\s*\*\/\s*$/)) {
        // only end of comment
        parserState.state = "READY";
        return [emitThis({bytes: Petscii.codes("\n")})];
      } else {
        // is this the last comment line?
        // TODO add unit test to be sure of wtf
        const m = line.match(/^(.*)\*\/\s*$/);
        if (m) {
          parserState.state = "READY";
          return [];//new LabelsCommentsOnly(new LabelsComments([], m[1])), parserState];
        } else {
          parserState.state = "MID_MULTILINE_COMMENT";
          return [];//[new LabelsCommentsOnly(new LabelsComments([], line.trim())), parserState];
        }
      }
    } else {
      throw new Error(`unknown parser state: ${parserState}`);
    }
  }

  lineCommentPrefix() {
    return SEMICOLON_PREFIX;
  }

  formatLabel(s: string): string {
    return `${s}: `;
  }

  hexByteText(b: number) {
    return "$" + hex8(b);
  }

  // TODO maybe instead introduce wordText(radix)

  hexWordText(x: number) {
    // assembler may support multiple syntaxes but this would be a user preference for the dialect from the environment
    return "$" + hex16(x);
  }

  decimalWordText(x: number) {
    return (0xffff & x).toString();
  }

  bytes(x: FullInstructionLine, _dis: Disassembler): Tag[] {
    // future: context may give us rules about grouping, pattern detection etc.
    const comments: Tag = new Tag([TAG_COMMENT], this.renderComments(x.labelsComments.comments));
    const labels: Tag = new Tag([TAG_LABEL], this.renderLabels(x.labelsComments.labels));
    const data: Tag = new Tag([TAG_DATA], this.env.indent() + tagText(this.byteDeclaration(x)));
    return [comments, labels, data];
  }

  text(x: FullInstructionLine | Directive, _dis: Disassembler): Tag[] {
    if (x.getLength() === 0) {
      throw Error("not entirely sure how to declare text for zero bytes");
    }
    const kw: Tag = new KeywordTag(RevengeDialect.KW_TEXT_DECLARATION);
    const petscii = x.getBytes().map(b => Petscii.C64.vice[b]).join("");
    // TODO TAG_PETSCII doesn't appear in html output
    const textTag = new Tag([TAG_PETSCII], `"${petscii}"`); // TODO not sure if this is any dialect
    const comments: Tag = new Tag([TAG_COMMENT], this.renderComments(x.labelsComments.comments));
    const labels: Tag = new Tag([TAG_LABEL], this.renderLabels(x.labelsComments.labels));
    const data: Tag = new Tag([TAG_DATA], this.env.indent() + tagText([kw, textTag]));
    return [comments, labels, data];
  }

  words(words: number[], lc: LabelsComments, dis: Disassembler): Tag[] {
    const comments: Tag = new Tag([TAG_COMMENT], this.renderComments(lc.comments));
    const labels: Tag = new Tag([TAG_LABEL], this.renderLabels(lc.labels));
    const tags: Tag[] = this.wordDeclaration(words, dis)
    const data: Tag = new Tag([TAG_DATA], this.env.indent() + tagText(tags));
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
    const comments: Tag = new Tag([TAG_COMMENT], this.renderComments(fil.labelsComments.comments));
    const labels: Tag = new Tag([TAG_LABEL], this.renderLabels(fil.labelsComments.labels));
    return [comments, labels, ...this.taggedCode(fil, dis)];
  }

  directive(dir: Directive, _dis: Disassembler): Tag[] {
    if (dir.isSymbolDefinition()) {
      // TODO don't have enough context to generate symbol
      // if value is in predefined symbol table, use label from symbol table
      throw Error(`Not Implemented`);
    } else {
      throw Error(`Not Implemented`);
    }
  }

  pcAssign(pcAssign: PcAssign, _dis: Disassembler): Tag[] {
    const comments = new Tag([TAG_COMMENT], this.renderComments(pcAssign.labelsComments.comments));
    const labels = new Tag([TAG_LABEL], this.renderLabels(pcAssign.labelsComments.labels));
    const pc = new Tag([TAG_CODE], "* =");
    const addr = new Tag([TAG_ABSOLUTE, TAG_OPERAND], this.hexWordText(pcAssign.address));
    const dummy = new Tag([TAG_NO_ADDRESS], " "); // TODO fix this hack with better columnar layout
    return [dummy, labels, pc, addr, comments];
  }

  symbolDefinition(symDef: SymbolDefinition, _dis: Disassembler): Tag[] {
    const comments = new Tag([TAG_COMMENT], this.renderComments(symDef.labelsComments.comments));
    const labels = new Tag([TAG_LABEL], this.renderLabels(symDef.labelsComments.labels));
    const symName = symDef.symDef.name;
    const symVal = `${this.hexWordText(symDef.symDef.value)}`;
    const symbolDefinition = new Tag([TAG_SYM_DEF], `${symName} = ${symVal}`);
    symbolDefinition.data.push(['symname', symName])
    const dummy = new Tag([TAG_NO_ADDRESS], " "); // TODO fix this hack with better columnar layout
    return [dummy, labels, symbolDefinition, comments];
  }

  /**
   * Parse an operand, either literal or symbolic
   * @param operand
   * @param am metadata about the assembler context
   * @private
   */
  parseOperand(operand: string, am: AssemblyMeta): OperandResolver | undefined {
    if (operand.length < 2) {
      return undefined;
    } else {
      if (this.isHexLiteral(operand)) {
        // hex literal
        const hexLiteral = operand.substring(1);
        console.log(`got hex literal ${hexLiteral}`);
        return new LiteralOperand(parseInt(hexLiteral, 16));
      } else if (operand.match(/^[0-9]*$/)) {
        return new LiteralOperand(parseInt(operand, 10));
      } else if (operand.match(/^[A-Za-z_]\w*$/)) {
        // label
        return new SymbolLookup(operand, am.symbolTable);
      }
    }
  }

  private isHexLiteral(operand: string) {
    return operand.startsWith("$");
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
        if (fil.fullInstruction.instruction.mode === MODE_ABSOLUTE) {
          if (dis.isInBinary(opnd)) {
            operandTag.classNames.push(TAG_IN_BINARY);
          } else {
            // for now only deal with symbols outside of binary
            const symDef = dis.getSymbol(opnd);
            if (symDef) {
              // we found a symbol for this add the data signifying usage of the symbol
              operandTag.data.push([`symname`, symDef.name]);
              operandTag.data.push([`symblurb`, symDef.descriptor]); // TODO maybe build a comment out of this
              operandTag.classNames.push(TAG_KNOWN_SYMBOL);
            }
          }
        }
        // add operand value as data so front-end can always extract it - could be symbol
        operandTag.data.push([TAG_OPERAND_VALUE, hex16(opnd)]);
      }
      return [mnemonic, operandTag];
    } else {
      return [mnemonic];
    }
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
    const kw: Tag = new KeywordTag(RevengeDialect.KW_BYTE_DECLARATION);
    const hexTag = new Tag([TAG_HEXARRAY], b.getBytes().map(this.hexByteText).join(", "));
    return [kw, hexTag];
  }

  private wordDeclaration(words: number[], dis: Disassembler): Tag[] {
    const kw: Tag = new KeywordTag(RevengeDialect.KW_WORD_DECLARATION);
    // TODO ask disassembler whether to use binary, decimal or hex
    if (dis.getLiteralRadix() === 10) {

      const values: Tag = new Tag([TAG_DECIMAL_ARRAY], words.map(this.decimalWordText).join(", "));
      return [kw, values];
    } else {
      const values: Tag = new Tag([TAG_HEXARRAY], words.map(this.hexWordText).join(", "));
      return [kw, values];
    }
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
      case MODE_ABSOLUTE: {
        const x = il.operand16();
        const symbol = dis.getSymbol(x);
        if (symbol !== undefined) {
          // TODO handle subroutines differently to registers?
          operand = symbol.name;
          dis.addSymbolDefinition(symbol);
          dis.addStat("symbol definitions");
        } else {
          operand = this.hexWordText(x);
        }
        break;
      }
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

export {RevengeDialect};