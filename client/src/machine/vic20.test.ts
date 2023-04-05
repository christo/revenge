import {UNEXPANDED_VIC_BASIC, VIC20_UNEX} from './vic20';
import {FileBlob} from "./FileBlob";
import {LITTLE} from "./core";


// TODO finish this test case
test("sniff minimal basic program", () => {
    let ba:number[] = [];
    // construct basic file then check sniff result

    LITTLE.wordToByteArray(VIC20_UNEX.basicStart).forEach(b => ba.push(b));


    const fb:FileBlob = new FileBlob("basic-test", ba.length, Uint8Array.from(ba));
    const score = UNEXPANDED_VIC_BASIC.sniff(fb);
    expect(score).toBeLessThan(0.1);
});

export {}