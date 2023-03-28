import {FileBlob} from "./FileBlob";
import {Petscii} from "./petscii";
import {hex16} from "../misc/BinUtils";
import {ActionResult} from "./revenge";

type Token = [number, string];

const isZilch = (x:number|undefined) => (x === undefined || x === 0);

/** Decodes a BASIC {@link FileBlob} into its program structure */
class BasicDecoder {
    private name: string;
    private minor: number;
    private major: number;
    private tokens: string[];

    private static readonly LOAD_ADDRESS_OFFSET = 0;
    private static readonly CONTENT_START_OFFSET = 2;
    private static readonly END_OF_LINE_BYTE = 0;
    private static readonly END_OF_PROGRAM_WORD = 0;

    constructor(name: string, minor: number, major: number) {
        this.name = name;
        this.minor = minor;
        this.major = major;
        this.tokens = [];
    }

    reg(tok: Token) {
        this.tokens[tok[0]] = tok[1];
    }

    decode(fb: FileBlob): ActionResult {
        const offset = BasicDecoder.CONTENT_START_OFFSET;
        // assuming the load address is the first two bytes.
        const baseAddress = fb.readVector(BasicDecoder.LOAD_ADDRESS_OFFSET);
        let i = offset;
        // read address of next BASIC line (may be the 0x0000 end marker)
        let nextLineAddr = baseAddress;
        let lineNumber = 0;
        let finished = false;
        let lines: ActionResult = []
        let line = "";
        while (!finished) {
            if (i - offset + baseAddress === nextLineAddr) {
                nextLineAddr = fb.readVector(i);
                i += 2;
                lineNumber = fb.readVector(i); // not really a vector but a 16 bit value
                i += 2;
                line = lineNumber.toString(10) + " ";
            }
            let b = fb.bytes.at(i++);
            const eol = b === 0;
            if (b === undefined) {
                console.error("byte no existo");
                finished = true;
            } else if (eol) {
                lines.push([["addr", hex16(nextLineAddr)], ["line", line]]);
            } else {
                let token = this.tokens[b];
                if (token === undefined) {
                    token = Petscii.PETSCII_C64[b];
                }
                line += token;
            }
            // two zero bytes mark the end, if we are out of bytes, same thing.
            const eof = isZilch(fb.bytes.at(i + 2)) && isZilch(fb.bytes.at(i + 3));
            finished = finished || (eol && eof);
        }
        return lines;
    }
}

const CBM_BASIC_2_0 = new BasicDecoder("Commodore BASIC", 2, 0);

const TOKENS: Token[] = [
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