// C64 specific details

import {FileBlob} from "./FileBlob";
import {BlobType, DisassemblyMetaImpl, hexDumper} from "./asm";
import {stringToArray} from "../misc/BinUtils";
import {CartSniffer} from "./cbm";
import {TypeActions} from "./revenge";

type BlobToActions = (fileBlob: FileBlob) => TypeActions;
const crt64Actions: BlobToActions = (fileBlob: FileBlob) => ({t: C64_CRT, actions: [hexDumper(fileBlob)]});

// CRT format detailed here: https://codebase64.org/doku.php?id=base:crt_file_format
const prefix = stringToArray("C64 CARTRIDGE   ");
const C64_CRT = new BlobType("CCS64 CRT", "ROM cart format by Per Hakan Sundell", ["crt"], "crt", prefix);

/** C64 reset vector is stored at this offset. */
const C64_RESET_VECTOR_OFFSET = 4;

/**
 * The base address for all 8kb C64 carts.
 */
const C64_8K_BASE_ADDRESS = 0x8000;

/**
 * 16kb carts load two 8k blocks, ROML at the normal base address
 * and ROMH at this address.
 */
const C64_ROMH_BASE_ADDRESS = 0xa000;

/**
 * Ultimax carts (for the pre-64 Japanese CBM Max machine) load two
 * 8kb images, ROML at the normal base address and ROMH at this one.
 */
const C64_ULTIMAX_ROMH_BASE_ADDRESS = 0xa000;

/** The cold reset vector is stored at this offset. */
const C64_COLD_VECTOR_OFFSET = 2;

/** The warm reset vector (NMI) is stored at this offset. */
const C64_WARM_VECTOR_OFFSET = 4;

/**
 * The C64 magic cartridge signature CBM80 in petscii.
 */
const CBM80 = [0xC3, 0xC2, 0xCD, 0x38, 0x30];

const C64_8K_CART = new CartSniffer(
    "C64 cart image",
    "ROM dump from C64",
    ["cart", "c64"],
    CBM80, 6,
    new DisassemblyMetaImpl(C64_8K_BASE_ADDRESS, C64_COLD_VECTOR_OFFSET, C64_WARM_VECTOR_OFFSET, 2)
);

export {crt64Actions, C64_CRT, C64_8K_CART};
