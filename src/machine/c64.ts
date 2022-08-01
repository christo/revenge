import Mos6502 from "./mos6502";
import {FileBlob,PRG,UNKNOWN} from "./FileBlob";


const detect = (fileBlob:FileBlob) => {
    let blob=fileBlob.bytes;
    if (PRG.extensionMatch(fileBlob.name) && blob.at(0) === 0x01 && blob.at(1) === 0x08) return PRG;
    return UNKNOWN;
}

class C64 {
    cpu;
    constructor() {
        this.cpu = new Mos6502();
    }
}

export {C64, detect};