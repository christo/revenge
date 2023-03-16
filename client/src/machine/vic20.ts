import {CartSniffer, prg} from "./cbm";
import {DisassemblyMeta, FileBlob} from "./FileBlob";

/**
 * VIC-20 cartridge magic signature A0CBM in petscii where
 * CBM is in reverse video (&70).
 */
const A0CBM = [0x41, 0x30, 0xc3, 0xc2, 0xcd];

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
    "contains A0CBM signature",
    A0CBM, 6,
    VIC20_BASE_ADDRESS_OFFSET, VIC20_COLD_VECTOR_OFFSET, VIC20_WARM_VECTOR_OFFSET
);

/** Common load addresses for machine language programs. */
const COMMON_MLPS = [
    prg([0x00, 0x40]),  // 0x4000
    prg([0x00, 0x60]),  // 0x6000
    prg([0x00, 0x80]),  // 0x8000
    prg([0x00, 0xa0]),  // 0xa000
    prg([0x00, 0xc0]),  // 0xc000
];

export {COMMON_MLPS, VIC20_CART}