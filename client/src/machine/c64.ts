import Mos6502 from "./mos6502";
import {FileBlob,BASIC_PRG,CRT_A000, UNKNOWN} from "./FileBlob";


const detect = (fileBlob:FileBlob) => {
    let blob=fileBlob.bytes;
    if (BASIC_PRG.extensionMatch(fileBlob.name) && blob.at(0) === 0x01 && blob.at(1) === 0x08) return BASIC_PRG;
    if (CRT_A000.prefixDataMatch(fileBlob)) return CRT_A000;
    return UNKNOWN;
}

class C64 {
    cpu;
    constructor() {
        this.cpu = new Mos6502();
    }
}

export {C64, detect};