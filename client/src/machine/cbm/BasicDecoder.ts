import {plural} from "../../ui/util.ts";
import {LogicalLine, Tag, TAG_ADDRESS, TAG_LINE, TAG_LINE_NUM, TAG_NOTE} from "../api.ts";
import {hex16, hex8} from "../../../../server/src/common/machine/core.ts";
import {DataView, DataViewImpl} from "../DataView.ts";
import {LittleEndian} from "../Endian.ts";
import {Memory} from "../Memory.ts";
import {Petscii} from "./petscii.ts";

type Token = [number, string];

const TOKEN_PRINT = 153;
const TOKEN_REM = 143;
const TOKEN_SPACE = 32;
const TOKEN_SYS = 158;
const TOKENS: Token[] = [
  [TOKEN_SPACE, " "],
  [128, "END"],
  [129, "FOR"],
  [130, "NEXT"],
  [131, "DATA"],
  [132, "INPUT#"],
  [133, "INPUT"],
  [134, "DIM"],
  [135, "READ"],
  [136, "LET"],
  [137, "GOTO"],
  [138, "RUN"],
  [139, "IF"],
  [140, "RESTORE"],
  [141, "GOSUB"],
  [142, "RETURN"],
  [TOKEN_REM, "REM"],
  [144, "STOP"],
  [145, "ON"],
  [146, "WAIT"],
  [147, "LOAD"],
  [148, "SAVE"],
  [149, "VERIFY"],
  [150, "DEF"],
  [151, "POKE"],
  [152, "PRINT#"],
  [TOKEN_PRINT, "PRINT"],
  [154, "CONT"],
  [155, "LIST"],
  [156, "CLR"],
  [157, "CMD"],
  [TOKEN_SYS, "SYS"],
  [159, "OPEN"],
  [160, "CLOSE"],
  [161, "GET"],
  [162, "NEW"],
  [163, "TAB("],
  [164, "TO"],
  [165, "FN"],
  [166, "SPC("],
  [167, "THEN"],
  [168, "NOT"],
  [169, "STEP"],
  [170, "+"],
  [171, "-"],
  [172, "*"],
  [173, "/"],
  [174, "^"],
  [175, "AND"],
  [176, "OR"],
  [177, ">"],
  [178, "="],
  [179, "<"],
  [180, "SGN"],
  [181, "INT"],
  [182, "ABS"],
  [183, "USR"],
  [184, "FRE"],
  [185, "POS"],
  [186, "SQR"],
  [187, "RND"],
  [188, "LOG"],
  [189, "EXP"],
  [190, "COS"],
  [191, "SIN"],
  [192, "TAN"],
  [193, "ATN"],
  [194, "PEEK"],
  [195, "LEN"],
  [196, "STR$"],
  [197, "VAL"],
  [198, "ASC"],
  [199, "CHR$"],
  [200, "LEFT$"],
  [201, "RIGHT$"],
  [202, "MID$"],
  [203, "GO"],
  [255, "π"]];

/**
 * Zero or undefined?
 * @param x
 */
const isZeroish = (x: number | undefined) => (x === undefined || x === 0);

/**
 * Constructs the LogicalLine representing a line of BASIC code
 * @param length
 * @param addr
 * @param basicLineNumber
 * @param lineContents
 */
const mkBasicLine = (length: number, addr: number, basicLineNumber: number, lineContents: string) => {
  const addressTag = new Tag([TAG_ADDRESS], hex16(addr));
  const lineNumberTag = new Tag([TAG_LINE_NUM], basicLineNumber.toString(10));
  const lineContentsTag = new Tag([TAG_LINE], lineContents);
  const ts = [addressTag, lineNumberTag, lineContentsTag]
  return new LogicalLine(ts, length, addr);
};

/**
 * Decodes a BASIC {@link FileBlob} into its program structure.
 */
class BasicDecoder {
  private static readonly LOAD_ADDRESS_OFFSET = 0;
  private static readonly CONTENT_START_OFFSET = 2;

  /**
   * BASIC program consisting of only the following line: 0 REM
   */
  private static MINIMAL_PROGRAM = Uint8Array.from([
    0x01, 0x10,    // standard unexpanded VIC basic load address (0x1001)
    0x07, 0x10,    // address of next line (terminating word) (0x1007)
    0x00, 0x00,     // line number (0)
    0x8f,           // token "REM"
    0x00,           // line end byte
    0x00, 0x00     // terminating word (0)
  ]);

  private static MINIMUM_SIZE: number = BasicDecoder.MINIMAL_PROGRAM.length;
  private name: string;
  private minor: number;
  private major: number;
  /**
   * Byte-indexed, sparse array.
   * @private
   */
  private readonly tokens: string[];

  constructor(name: string, minor: number, major: number) {
    this.name = name;
    this.minor = minor;
    this.major = major;
    this.tokens = [];
  }

  reg(tok: Token) {
    this.tokens[tok[0]] = tok[1];
  }

  decode(source: Memory<LittleEndian>): DataView {
    if (source.getLength() < BasicDecoder.MINIMUM_SIZE) {
      throw Error("file is too small to be a valid basic program");
    }
    // offset in file of actualy content
    const offset = BasicDecoder.CONTENT_START_OFFSET;
    // assuming the load address is the first two bytes.
    const baseAddress = source.read16(BasicDecoder.LOAD_ADDRESS_OFFSET);

    // read address of next BASIC line (may be the 0x0000 end marker)
    let nextLineAddr = baseAddress;
    let thisLineAddr = nextLineAddr;
    let lineNumber = 0;
    let finished = false;
    const dataView: DataView = new DataViewImpl([]);
    let line = "";
    let quoteMode = false;

    let i = offset;
    let lineOffsetStart = i;
    while (!finished) {
      // have we reached the byte offset of the next line?
      const isNewLine = i - offset + baseAddress === nextLineAddr;
      if (isNewLine) {
        lineOffsetStart = i;
        quoteMode = false;
        thisLineAddr = nextLineAddr;
        nextLineAddr = source.read16(i);
        if (nextLineAddr === 0) {
          throw Error("tripped end of program unexpectedly"); // shouldn't happen
        }
        i += 2; // advance after next line link pointer
        lineNumber = source.read16(i);
        i += 2; // advance after basic line number
        line = " "; // the space after the line number
      }
      const b = source.getBytes().at(i++);
      const eol = b === 0;
      if (b === undefined) {
        console.error("byte no existo");
        finished = true;
      } else if (eol) {
        const byteSize = i - lineOffsetStart;
        dataView.addLine(mkBasicLine(byteSize, thisLineAddr, lineNumber, line));
      } else {
        // interpret as a character in quoteMode, otherwise a BASIC token
        const token = quoteMode ? Petscii.C64.vice[b] : this.decodeToken(b);
        // toggle quotemode
        if (token === '"') {
          quoteMode = !quoteMode;
        }
        line += token;
      }
      // two zero bytes mark the end, if we are out of bytes, same thing.
      // i has already been incremented, so i and i+1 peek ahead for a zero-terminating word
      const eof = isZeroish(source.read8(i)) && isZeroish(source.read8(i + 1));
      finished = finished || (eol && eof);
    }

    // "i" is pointing at the termination word
    const remainingBytes = source.getLength() - i - 2;

    function mkHexString() {
      // TODO duplicated code; machine context and user config should determine numeric formatting
      return source.getBytes().slice(source.getLength() - remainingBytes).map(n => `$${hex8(n)}`).join(", ");
    }

    if (remainingBytes > 0) {
      // for now if there aren't many bytes, just show a mini hex dump, otherwise just count them
      const descBytes = ((remainingBytes < 16) ? mkHexString() : `${remainingBytes}`);

      const note = new Tag([TAG_NOTE], `${remainingBytes} trailing ${plural(remainingBytes, "byte")}: ${descBytes}`);
      const numBytes = baseAddress + i + 2; // 2 is the content offset because of load address
      const addr = new Tag([TAG_ADDRESS], hex16(numBytes));
      dataView.addLine(new LogicalLine([note, addr], remainingBytes, numBytes));
    }

    return dataView;
  }

  /** Interprets the given byte as a token, which just equals the Petscii if bit 7 is 0 */
  private decodeToken(b: number) {
    return this.tokens[b] || Petscii.C64.vice[b];
  }
}

const CBM_BASIC_2_0 = new BasicDecoder("Commodore BASIC", 2, 0);

TOKENS.forEach(t => CBM_BASIC_2_0.reg(t));

export {CBM_BASIC_2_0, TOKEN_REM, TOKEN_PRINT, TOKEN_SYS, TOKEN_SPACE};