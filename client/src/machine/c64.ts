import {Mos6502} from "./mos6502";
import {BlobType, FileBlob} from "./FileBlob";
import {hexDumper} from "./asm";
import {stringToArray} from "../misc/BinUtils";


function crt64Actions(fileBlob: FileBlob) {
    // TODO flesh out the desc from the cart header metadata as defined here:
    // https://codebase64.org/doku.php?id=base:crt_file_format
    return {t:C64_CRT, actions: [hexDumper]};
}

// CRT format detailed here: https://codebase64.org/doku.php?id=base:crt_file_format
const prefix = stringToArray("C64 CARTRIDGE   ");
const C64_CRT = new BlobType("CCS64 CRT", "ROM cart format by Per Hakan Sundell", "crt", prefix);

// we don't need this yet...
class C64 {
    cpu;
    constructor() {
        this.cpu = new Mos6502();
    }
}

class C64CartSniffer {
    /** C64 reset vector is stored at this offset. */
    static C64_RESET_VECTOR_OFFSET = 4;

    /**
     * The base address for all 8kb C64 carts.
     */
    static C64_8K_BASE_ADDRESS = 0x8000;

    /**
     * 16kb carts load two 8k blocks, ROML at the normal base address
     * and ROMH at this address.
     */
    static C64_ROMH_BASE_ADDRESS = 0xa000;

    /**
     * Ultimax carts (for the pre-64 Japanese CBM Max machine) load two
     * 8kb images, ROML at the normal base address and ROMH at this one.
     */
    static C64_ULTIMAX_ROMH_BASE_ADDRESS = 0xa000;
}


export {C64, crt64Actions, C64_CRT};

/**
 * The C64 magic cartridge signature CBM80 in petscii.
 */
const CBM80 = [0xC3, 0xC2, 0xCD, 0x38, 0x30];