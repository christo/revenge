import {expect} from "chai";
import * as fs from "fs";
import {TOKEN_PRINT, TOKEN_REM} from "../../../src/common/machine/cbm/BasicDecoder.js";
import {Petscii} from "../../../src/common/machine/cbm/petscii.js";
import {
  UNEXPANDED_VIC_BASIC,
  Vic20,
  VIC20_CART_SNIFFER,
  Vic20BasicSniffer
} from "../../../src/common/machine/cbm/vic20.js";
import {Vic20StubSniffer} from "../../../src/common/machine/cbm/Vic20StubSniffer.js";
import {Addr} from "../../../src/common/machine/core.js";
import {LE} from "../../../src/common/machine/Endian.js";
import {FileBlob} from "../../../src/common/machine/FileBlob.js";
import {Mos6502} from "../../../src/common/machine/mos6502.js";
import {PRELOADS_DIR_VIC20} from "../../../src/constants.js";


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

function pathToFileblob(path: string) {
  const f = fs.readFileSync(path);
  return FileBlob.fromBytes(path, Array.from(f), Mos6502.ENDIANNESS);
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
    const msgs = stench.messages.join("|");
    expect(stench.score).gte(1, `minimal but well formed program, mesgs: [${msgs}]`);
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
    const fb = pathToFileblob(`../server/${PRELOADS_DIR_VIC20}/helloworld.prg`);
    const sut = new Vic20StubSniffer(unexpanded);
    const stench = sut.sniff(fb);
    expect(stench.score).gte(2);
    expect(stench.score).gt(new Vic20BasicSniffer(Vic20.MEM_CONFIG.EXP03K).sniff(fb).score);
    expect(stench.score).gt(new Vic20BasicSniffer(Vic20.MEM_CONFIG.EXP08K).sniff(fb).score);
    expect(stench.score).gt(new Vic20BasicSniffer(Vic20.MEM_CONFIG.EXP16K).sniff(fb).score);
    expect(stench.score).gt(new Vic20BasicSniffer(Vic20.MEM_CONFIG.EXP24K).sniff(fb).score);
    expect(stench.score).gt(new Vic20BasicSniffer(Vic20.MEM_CONFIG.EXP32K).sniff(fb).score);
  });
  
  it("comparative sniffs for different types", () => {
    // hello world is machine code with basic stub
    const hello = pathToFileblob(`../server/${PRELOADS_DIR_VIC20}/helloworld.prg`);
    // killer comet is basic for unexpanded vic
    const killer = pathToFileblob(`../server/${PRELOADS_DIR_VIC20}/Killer Comet.prg`);
    // avenger is cart
    const avenger = pathToFileblob(`../server/${PRELOADS_DIR_VIC20}/Avenger.prg`);
    
    const stub = new Vic20StubSniffer(unexpanded);

    const stubSniffHello = stub.sniff(hello).score;
    const basicSniffHello = UNEXPANDED_VIC_BASIC.sniff(hello).score;
    const cartSniffHello = VIC20_CART_SNIFFER.sniff(hello).score;
    
    expect(stubSniffHello).gt(basicSniffHello, "hello world should smell more like mc w/ stub than basic");
    expect(stubSniffHello).gt(cartSniffHello, "hello world should smell more like mc w/ stub than cart");
    
    const basicSniffKiller = UNEXPANDED_VIC_BASIC.sniff(killer).score;
    const stubSniffKiller = stub.sniff(killer).score;
    const cartSniffKiller = VIC20_CART_SNIFFER.sniff(killer).score;
    
    expect(basicSniffKiller).gt(cartSniffKiller, "killer comet should look more like basic than cart");
    expect(basicSniffKiller).gt(stubSniffKiller, "killer comet should look more like basic than mc w/ stub");

    const basicAvengerStench = UNEXPANDED_VIC_BASIC.sniff(avenger);
    basicAvengerStench.messages.forEach(m => console.log(m.toString()));
    const basicSniffAvenger = basicAvengerStench.score;
    const stubSniffAvenger = stub.sniff(avenger).score;
    const cartSniffAvenger = VIC20_CART_SNIFFER.sniff(avenger).score;

    expect(cartSniffAvenger).gt(stubSniffAvenger, "avenger should look more like cart than mc w/ stub");
    expect(cartSniffAvenger).gt(basicSniffAvenger, "avenger should look more like cart than basic");

  });
});

export {};