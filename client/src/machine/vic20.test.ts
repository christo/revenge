import {UNEXPANDED_VIC_BASIC, Vic20, VIC20_UNEX} from './vic20';
import {FileBlob} from "./FileBlob";


// TODO finish this test case
const TOKEN_PRINT = 153;

test("sniff basic program consisting only of line: 0 PRINT", () => {

    const VIC = new Vic20(VIC20_UNEX);
    let ba:number[] = [];
    // construct basic file then check sniff result

    // future: wouldn't it be cool to have a fluent interface for building basic programs?
    const baseAddr = VIC20_UNEX.basicStart;
    VIC.pushWordBytes(ba, baseAddr);
    let firstLine:number[] = [];
    VIC.pushWordBytes(firstLine, 0); // line number
    firstLine.push(TOKEN_PRINT);
    firstLine.push(0x00); // end byte
    const addressOfNextLine = baseAddr + firstLine.length;
    VIC.pushWordBytes(ba, addressOfNextLine);
    firstLine.forEach(x => ba.push(x));
    ba.push(0x00, 0x00); // end of program

    const fb:FileBlob = new FileBlob("basic-test", ba.length, Uint8Array.from(ba));
    const score = UNEXPANDED_VIC_BASIC.sniff(fb);
    expect(score).toBeGreaterThan(1);   // this is a well-formed minimal basic program
});

export {}