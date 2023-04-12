import {UNEXPANDED_VIC_BASIC, Vic20, VIC20_UNEX} from './vic20';
import {FileBlob} from "./FileBlob";
import {Address, asHex, LE} from "./core";
import {TOKEN_PRINT, TOKEN_REM} from "./basic";
import {codes} from "./petscii";


/**
 * Makes a basic line including the line number, excluding line terminator and next line address.
 * Returned line includes address of next line and line terminator.
 *
 * @param addr the memory address of this line
 * @param lineNumber positive 16-bit integer basic line number
 * @param lineContents valid basic line contents, token bytes or petscii bytes
 * @return a tuple of line address and array of basic bytes according to the valid basic format
 */
const basicLine = (addr:Address, lineNumber:number, lineContents:number[]):[Address, number[]] => {
    const lineNumberBytes = LE.wordToTwoBytes(lineNumber);
    const EOL_LENGTH = 1; // bytes in EOL value
    const EOL_VALUE = 0;
    const lineLength = lineNumberBytes.length + lineContents.length + EOL_LENGTH;
    const nextLineAddress = addr + lineLength;
    const nextLineBytes = LE.wordToTwoBytes(nextLineAddress);
    const basicBytes = [nextLineBytes[0], nextLineBytes[1], lineNumberBytes[0], lineNumberBytes[1], ...lineContents, EOL_VALUE];

    return [nextLineAddress, basicBytes];
}


test("sniff basic program consisting only of line: 0 PRINT", () => {
    const VIC = new Vic20(VIC20_UNEX);
    let ba:number[] = [];
    const baseAddr = VIC20_UNEX.basicStart;
    VIC.pushWordBytes(ba, baseAddr);
    let [lineAddress,bline] = basicLine(baseAddr, 0, [TOKEN_PRINT]);
    // don't need next line address on last and only basic line
    bline.forEach((i) => ba.push(i));
    ba.push(0x00, 0x00); // end of program

    const fb:FileBlob = new FileBlob("basic-test", ba, LE);
    const score = UNEXPANDED_VIC_BASIC.sniff(fb);
    expect(score).toBeGreaterThan(1);   // this is a well-formed minimal basic program
});

test("sniff basic program with non-ascending line numbers", () => {
    const VIC = new Vic20(VIC20_UNEX);
    let ba:number[] = [];
    VIC.pushWordBytes(ba, VIC20_UNEX.basicStart);
    let [addr, line] = basicLine(VIC20_UNEX.basicStart, 10, [TOKEN_PRINT]);
    line.forEach(i => ba.push(i));
    [addr, line] = basicLine(addr, 9, [TOKEN_REM, ...codes(" lower line number")]);
    line.forEach(i => ba.push(i));
    [addr, line] = basicLine(addr, 9, [TOKEN_REM, ...codes(" same line number")]);
    line.push(0, 0); // end of program

    const fb:FileBlob = new FileBlob("basic-descending-lnums", ba, LE);
    const score = UNEXPANDED_VIC_BASIC.sniff(fb);
    expect(score).toBeLessThan(1);
});

export {}