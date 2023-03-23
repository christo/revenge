import {FileBlob} from "./FileBlob";
import {TagSeq} from "./asm";
import {Petscii} from "./petscii";
import {hex16} from "../misc/BinUtils";
import {ActionResult} from "./revenge";

/** Decodes a BASIC {@link FileBlob} into its program structure */
class BasicDecoder {
    private name: string;
    private minor: number;
    private major: number;
    private tokens: string[];

    constructor(name: string, minor: number, major: number) {
        this.name = name;
        this.minor = minor;
        this.major = major;
        this.tokens = [];
    }

    reg(value: number, tok: string) {
        this.tokens[value] = tok;
    }

    decode(fb:FileBlob):ActionResult {
        const offset = 2;
        // assuming the load address is the first two bytes.
        const baseAddress = fb.readVector(0);
        let i = offset;
        // read address of next BASIC line (may not exist)
        let nextLineAddr = baseAddress;
        let lineNumber = 0;
        let finished = false;
        let lines:ActionResult = []
        let line = "";
        while(!finished) {
            if (i - offset + baseAddress === nextLineAddr) {
                nextLineAddr = fb.readVector(i);
                i += 2
                lineNumber = fb.readVector(i)
                i += 2
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
            const peek = fb.bytes.at(i+2 );
            // zero terminator marks the end, if we are out of bytes, same thing.
            const eof = peek === undefined || peek === 0;
            finished = finished || (eol && eof);
        }
        return lines;
    }
}

const CBM_BASIC_2_0 = new BasicDecoder("Commodore BASIC", 2, 0);
const tok = (value: number, token: string) => {
    CBM_BASIC_2_0.reg(value, token);
}

tok(128, "END");
tok(129, "FOR");
tok(130, "NEXT");
tok(131, "DATA");
tok(132, "INPUT#");
tok(133, "INPUT");
tok(134, "DIM");
tok(135, "READ");
tok(136, "LET");
tok(137, "GOTO");
tok(138, "RUN");
tok(139, "IF");
tok(140, "RESTORE");
tok(141, "GOSUB");
tok(142, "RETURN");
tok(143, "REM");
tok(144, "STOP");
tok(145, "ON");
tok(146, "WAIT");
tok(147, "LOAD");
tok(148, "SAVE");
tok(149, "VERIFY");
tok(150, "DEF");
tok(151, "POKE");
tok(152, "PRINT#");
tok(153, "PRINT");
tok(154, "CONT");
tok(155, "LIST");
tok(156, "CLR");
tok(157, "CMD");
tok(158, "SYS");
tok(159, "OPEN");
tok(160, "CLOSE");
tok(161, "GET");
tok(162, "NEW");
tok(163, "TAB(");
tok(164, "TO");
tok(165, "FN");
tok(166, "SPC(");
tok(167, "THEN");
tok(168, "NOT");
tok(169, "STEP");
tok(170, "+");
tok(171, "-");
tok(172, "*");
tok(173, "/");
tok(174, "^");
tok(175, "AND");
tok(176, "OR");
tok(177, ">");
tok(178, "=");
tok(179, "<");
tok(180, "SGN");
tok(181, "INT");
tok(182, "ABS");
tok(183, "USR");
tok(184, "FRE");
tok(185, "POS");
tok(186, "SQR");
tok(187, "RND");
tok(188, "LOG");
tok(189, "EXP");
tok(190, "COS");
tok(191, "SIN");
tok(192, "TAN");
tok(193, "ATN");
tok(194, "PEEK");
tok(195, "LEN");
tok(196, "STR$");
tok(197, "VAL");
tok(198, "ASC");
tok(199, "CHR$");
tok(200, "LEFT$");
tok(201, "RIGHT$");
tok(202, "MID$");
tok(203, "GO");
tok(255, "π");

export {CBM_BASIC_2_0, BasicDecoder}