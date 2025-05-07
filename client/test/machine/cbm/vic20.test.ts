import {expect} from "chai";
import fs from "fs";
import {PRELOADS_DIR_VIC20} from "../../../../server/src/routes/constants.ts";
import {TOKEN_PRINT, TOKEN_REM} from "../../../src/machine/cbm/BasicDecoder.ts";
import {Petscii} from "../../../src/machine/cbm/petscii.ts";
import {UNEXPANDED_VIC_BASIC, Vic20} from "../../../src/machine/cbm/vic20.ts";
import {Vic20StubSniffer} from "../../../src/machine/cbm/Vic20StubSniffer.ts";
import {Addr} from "../../../../server/src/common/machine/core.ts";
import {LE} from "../../../src/machine/Endian.ts";
import {FileBlob} from "../../../src/machine/FileBlob.ts";
import {Mos6502} from "../../../src/machine/mos6502.ts";


/**
 * Makes a basic line including the line number, excluding line terminator and next line address.
 * Returned line includes address of next line and line terminator.
 *
 * @param addr the memory address of this line
 * @param lineNumber positive 16-bit integer basic line number
 * @param lineContents valid basic line contents, token bytes or petscii bytes
 * @return a tuple of line address and array of basic bytes according to the valid basic format
 */
function basicLine(addr: Addr, lineNumber: number, lineContents: number[]): [Addr, number[]] {
  const lineNumberBytes = LE.wordToTwoBytes(lineNumber);
  const EOL_LENGTH = 1; // bytes in EOL value
  const EOL_VALUE = 0;
  const lineLength = lineNumberBytes.length + lineContents.length + EOL_LENGTH;
  const nextLineAddress = addr + lineLength;
  const nextLineBytes = LE.wordToTwoBytes(nextLineAddress);
  const basicBytes = [
    nextLineBytes[0],
    nextLineBytes[1],
    lineNumberBytes[0],
    lineNumberBytes[1],
    ...lineContents,
    EOL_VALUE
  ];

  return [nextLineAddress, basicBytes];
}

describe("vic20", () => {
  const unexpanded = Vic20.MEM_CONFIG.UNEX;
  it("sniff basic program consisting only of line: 0 PRINT", () => {
    const memConfig = unexpanded;
    const VIC = new Vic20(memConfig);
    const ba: number[] = [];
    const baseAddr = memConfig.basicProgramStart;
    VIC.pushWordBytes(ba, baseAddr);
    const [, bline] = basicLine(baseAddr, 0, [TOKEN_PRINT]);
    // don't need next line address on last and only basic line
    bline.forEach((i) => ba.push(i));
    ba.push(0x00, 0x00); // end of program

    const fb: FileBlob = FileBlob.fromBytes("basic-test", ba, VIC.cpu.endianness());
    const stench = UNEXPANDED_VIC_BASIC.sniff(fb);
    expect(stench.score).gte(1);   // this is a well-formed minimal basic program
  });

  it("sniff basic program with non-ascending line numbers", () => {
    const VIC = new Vic20(unexpanded);
    const ba: number[] = [];
    VIC.pushWordBytes(ba, unexpanded.basicProgramStart);
    let [addr, line] = basicLine(unexpanded.basicProgramStart, 10, [TOKEN_PRINT]);
    line.forEach(i => ba.push(i));
    [addr, line] = basicLine(addr, 9, [TOKEN_REM, ...Petscii.codes(" lower line number")]);
    line.forEach(i => ba.push(i));
    [, line] = basicLine(addr, 9, [TOKEN_REM, ...Petscii.codes(" same line number")]);
    line.push(0, 0); // end of program

    const fb: FileBlob = FileBlob.fromBytes("basic-descending-lnums", ba, LE);
    const stench = UNEXPANDED_VIC_BASIC.sniff(fb);
    expect(stench.score).lt(1);
  });

  it("sniff helloworld.prg machine code with basic stub", () => {
    const f = fs.readFileSync(`../server/${PRELOADS_DIR_VIC20}/helloworld.prg`);
    const fb = FileBlob.fromBytes("helloworld", Array.from(f), Mos6502.ENDIANNESS);
    const sut = new Vic20StubSniffer(unexpanded);
    const stench = sut.sniff(fb);
    expect(stench.score).gte(2);
  });
});

export {};