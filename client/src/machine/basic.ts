/*
 Commodore BASIC
 */

import {FileBlob} from "./FileBlob";
import {Petscii} from "./petscii";
import {hex16} from "./core";
import {DataView, Tag} from "./api";

type Token = [number, string];

const isZilch = (x: number | undefined) => (x === undefined || x === 0);

/**
 * Decodes a BASIC {@link FileBlob} into its program structure.
 */
class BasicDecoder {
    private name: string;
    private minor: number;
    private major: number;

    /**
     * Byte-indexed, sparse array.
     * @private
     */
    private readonly tokens: string[];

    private static readonly LOAD_ADDRESS_OFFSET = 0;
    private static readonly CONTENT_START_OFFSET = 2;
    private static MINIMUM_SIZE: number = 3; // TODO calculate this correctly

    constructor(name: string, minor: number, major: number) {
        this.name = name;
        this.minor = minor;
        this.major = major;
        this.tokens = [];
    }

    reg(tok: Token) {
        this.tokens[tok[0]] = tok[1];
    }

    decode(fb: FileBlob): DataView {
        if (fb.size < BasicDecoder.MINIMUM_SIZE) {
            throw Error("fb is too small to be valid basic")
        }
        const offset = BasicDecoder.CONTENT_START_OFFSET;
        // assuming the load address is the first two bytes.
        const baseAddress = fb.readVector(BasicDecoder.LOAD_ADDRESS_OFFSET);
        let i = offset;
        // read address of next BASIC line (may be the 0x0000 end marker)
        let nextLineAddr = baseAddress;
        let lineNumber = 0;
        let finished = false;
        let lines: DataView = []
        let line = "";
        let quoteMode = false;
        while (!finished) {
            const newLine = i - offset + baseAddress === nextLineAddr;
            if (newLine) {
                quoteMode = false;
                nextLineAddr = fb.readVector(i);
                if (nextLineAddr === 0) {
                    throw Error("tripped end of program unexpectedly"); // shouldn't happen
                }
                i += 2;
                lineNumber = fb.readVector(i); // not really a vector but a 16 bit value
                i += 2;
                line = " "; // the space after the line number
            }
            let b = fb.bytes.at(i++);
            const eol = b === 0;
            if (b === undefined) {
                console.error("byte no existo");
                finished = true;
            } else if (eol) {
                const address = new Tag(hex16(nextLineAddr), "addr");
                const lineNum = new Tag(lineNumber.toString(10), "lnum");
                const lineText = new Tag(line, "line");
                lines.push([address, lineNum, lineText]);
            } else {
                // interpret as a token, falling back to petscii
                let token = this.tokens[b];
                if (quoteMode || token === undefined) {
                    // in quotemode we never want the basic keyword to appear
                    token = Petscii.C64.vice[b];
                }
                if (token === '"') {
                    quoteMode = !quoteMode;
                }
                line += token;
            }
            // two zero bytes mark the end, if we are out of bytes, same thing.
            // i has already been incremented, so i and i+1 peek ahead for a zero-terminating word
            const eof = isZilch(fb.bytes.at(i)) && isZilch(fb.bytes.at(i + 1));
            finished = finished || (eol && eof);
        }

        // "i" is pointing at the termination word
        const remainingBytes = fb.bytes.length - i - 2;
        if (remainingBytes > 0) {
            const note = new Tag(`${remainingBytes} remaining bytes`, "note");
            const addr = new Tag(hex16(baseAddress + i + 2), "addr");
            lines.push([note, addr]);
        }
        return lines;
    }
}

const CBM_BASIC_2_0 = new BasicDecoder("Commodore BASIC", 2, 0);

const TOKENS: Token[] = [
    [32, " "],
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
    [143, "REM"],
    [144, "STOP"],
    [145, "ON"],
    [146, "WAIT"],
    [147, "LOAD"],
    [148, "SAVE"],
    [149, "VERIFY"],
    [150, "DEF"],
    [151, "POKE"],
    [152, "PRINT#"],
    [153, "PRINT"],
    [154, "CONT"],
    [155, "LIST"],
    [156, "CLR"],
    [157, "CMD"],
    [158, "SYS"],
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
TOKENS.forEach(t => CBM_BASIC_2_0.reg(t));

export {CBM_BASIC_2_0, BasicDecoder}