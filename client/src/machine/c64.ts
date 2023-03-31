// C64 specific details
// noinspection JSUnusedLocalSymbols

import {FileBlob} from "./FileBlob";
import {
    BlobType,
    ByteDefinitionPrecept,
    DisassemblyMetaImpl,
    hexDumper,
    JumpTargetFetcher, LabelsComments,
    mkLabels,
    VectorDefinitionPrecept
} from "./asm";
import {stringToArray} from "./core";
import {CartSniffer, MemoryConfiguration, wordToEndianBytes} from "./cbm";
import {BlobToActions} from "./revenge";

const C64_MEMORY = new MemoryConfiguration("C64 standard 64k", 0x0801);
const C64_BASIC_PRG = new BlobType("C64 basic prg", "BASIC program", ["basic", "c64"], "prg", wordToEndianBytes(C64_MEMORY.basicStart));

// CRT format detailed here: https://codebase64.org/doku.php?id=base:crt_file_format
const prefix = stringToArray("C64 CARTRIDGE   ");
const C64_CRT = new BlobType("CCS64 CRT", "ROM cart format by Per Hakan Sundell", ["crt"], "crt", prefix);
const crt64Actions: BlobToActions = (fileBlob: FileBlob) => ({t: C64_CRT, actions: [hexDumper(fileBlob)]});

/**
 * The base address for all 8kb C64 carts.
 */
const C64_8K_BASE_ADDRESS = 0x8000;

/**
 * 16kb carts load two 8k blocks, ROML at the normal base address
 * and ROMH at this address.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const C64_ROMH_BASE_ADDRESS = 0xa000;

/**
 * Ultimax carts (for the pre-64 Japanese CBM Max machine) load two
 * 8kb images, ROML at the normal base address and ROMH at this one.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const C64_ULTIMAX_ROMH_BASE_ADDRESS = 0xa000;

/** The cold reset vector is stored at this offset. */
const C64_COLD_VECTOR_OFFSET = 2;

/** The warm reset vector (NMI) is stored at this offset. */
const C64_WARM_VECTOR_OFFSET = 4;

/**
 * The C64 magic cartridge signature CBM80 in petscii.
 */
const CBM80 = [0xC3, 0xC2, 0xCD, 0x38, 0x30];

const MAGIC_OFFSET = 6;

const C64_CART_MAGIC = new ByteDefinitionPrecept(MAGIC_OFFSET, CBM80.length, new LabelsComments("cartSig", "specified by C64 cart format"));
const C64_CART_NMI_VECTOR = new VectorDefinitionPrecept(C64_COLD_VECTOR_OFFSET, mkLabels("resetVector"));
const C64_CART_RESET_VECTOR = new VectorDefinitionPrecept(C64_WARM_VECTOR_OFFSET, mkLabels("nmiVector"));

const jumpTargetFetcher:JumpTargetFetcher = (fb:FileBlob) => [
    [fb.readVector(C64_COLD_VECTOR_OFFSET), mkLabels("reset")],
    [fb.readVector(C64_WARM_VECTOR_OFFSET), mkLabels("nmi")]
]

const C64_8K_CART = new CartSniffer(
    "C64 cart image",
    "ROM dump from C64",
    ["cart", "c64"],
    CBM80, MAGIC_OFFSET,
    new DisassemblyMetaImpl(
        C64_8K_BASE_ADDRESS,
        C64_COLD_VECTOR_OFFSET,
        2, [
            C64_CART_MAGIC,
            C64_CART_RESET_VECTOR,
            C64_CART_NMI_VECTOR
        ],
        jumpTargetFetcher)
);


export {crt64Actions, C64_CRT, C64_8K_CART, C64_BASIC_PRG};
