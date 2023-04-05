import {UNEXPANDED_VIC_BASIC, VIC20_UNEX, Vic20Basic} from './vic20';
import {FileBlob} from "./FileBlob";


test("sniff not valid basic", () => {
    let ba:number[] = [];
    // construct basic file then check sniff result

    ba.push(VIC20_UNEX.basicStart)

    const fb:FileBlob = new FileBlob("basic-test", ba.length, Uint8Array.from(ba));
    const score = UNEXPANDED_VIC_BASIC.sniff(fb);
    expect(score).toBeLessThan(0.1);
});

export {}