// VIC-20 specific details

import {CartSniffer, prg} from "./cbm";
import {BlobSniffer, DisassemblyMeta, DisassemblyMetaImpl} from "./asm";
import {BasicDecoder} from "./basic";
import {FileBlob} from "./FileBlob";

/**
 * VIC-20 cartridge magic signature A0CBM in petscii where
 * CBM is in reverse video (&70).
 */
const A0CBM = [0x41, 0x30, 0xc3, 0xc2, 0xcd];
const MAGIC_OFFSET = 6;

/** The loading address vector is in the image at this offset. */
const VIC20_BASE_ADDRESS_OFFSET = 0;
/** The cold reset vector is stored at this offset. */
const VIC20_COLD_VECTOR_OFFSET = 2;
/** The warm reset vector (NMI) is stored at this offset. */
const VIC20_WARM_VECTOR_OFFSET = 4;

/** VIC-20 cart image sniffer. */
const VIC20_CART = new CartSniffer(
    "VIC-20 cart image",
    "ROM dump from VIC-20",
    ["cart", "vic20"],
    A0CBM, MAGIC_OFFSET,
    new DisassemblyMetaImpl(VIC20_BASE_ADDRESS_OFFSET, VIC20_COLD_VECTOR_OFFSET, VIC20_WARM_VECTOR_OFFSET, 2)
);

/** Common load addresses for machine language programs. */
const COMMON_MLPS = [
    prg([0x00, 0x40]),  // 0x4000
    prg([0x00, 0x60]),  // 0x6000
    prg([0x00, 0x80]),  // 0x8000
    prg([0x00, 0xa0]),  // 0xa000
    prg([0x00, 0xc0]),  // 0xc000
];

class UnexpandedVicBasic implements BlobSniffer {
    desc: string;
    name: string;
    tags: string[];

    constructor() {
        this.desc = "Unexpanded VIC";
        this.name = "BASIC prg";
        this.tags=["basic", "vic20"];
    }

    getDisassemblyMeta(): DisassemblyMeta {
        return DisassemblyMetaImpl.NULL_DISSASSEMBLY_META;
    }

    sniff(fb: FileBlob): number {
        return fb.submatch(new Uint8Array([0x01, 0x10]), 0) ? 1.2 : 0.8;
    }

}

const UNEXPANDED_VIC_BASIC = new UnexpandedVicBasic();

export {COMMON_MLPS, VIC20_CART, UNEXPANDED_VIC_BASIC}