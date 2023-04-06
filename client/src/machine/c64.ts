// C64 specific details
// noinspection JSUnusedLocalSymbols


import {FileBlob} from "./FileBlob";
import {
    BlobType,
    ByteDefinitionEdict,
    DisassemblyMetaImpl,
    JumpTargetFetcher,
    LabelsComments,
    mkLabels, SymbolTable,
    VectorDefinitionEdict
} from "./asm";
import {CartSniffer} from "./cbm";
import {BlobToActions, hexDumper, MemoryConfiguration} from "./api";
import {LITTLE} from "./core";

const C64_MEMORY = new MemoryConfiguration("C64 standard 64k", 0x0801);
const C64_BASIC_PRG = new BlobType(
    "C64 basic prg",
    "BASIC program",
    ["basic", "c64"],
    "prg",
    LITTLE.wordToByteArray(C64_MEMORY.basicStart)
);

/** Returns the given string as an array of char codes */
const codes = (s: string): number[] => {
    const prefix = [];
    for (let i = 0; i < s.length; i++) {
        prefix.push(s.charCodeAt(i));
    }
    return prefix;
}

// CRT format detailed here: https://codebase64.org/doku.php?id=base:crt_file_format
const prefix = codes("C64 CARTRIDGE   ");
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

const C64_CART_MAGIC = new ByteDefinitionEdict(MAGIC_OFFSET, CBM80.length, new LabelsComments("cartSig", "specified by C64 cart format"));
const C64_CART_NMI_VECTOR = new VectorDefinitionEdict(C64_COLD_VECTOR_OFFSET, mkLabels("resetVector"));
const C64_CART_RESET_VECTOR = new VectorDefinitionEdict(C64_WARM_VECTOR_OFFSET, mkLabels("nmiVector"));

const jumpTargetFetcher: JumpTargetFetcher = (fb: FileBlob) => [
    [fb.readVector(C64_COLD_VECTOR_OFFSET), mkLabels("reset")],
    [fb.readVector(C64_WARM_VECTOR_OFFSET), mkLabels("nmi")]
]

const C64_KERNAL = new SymbolTable();
C64_KERNAL.reg(0xFFA5, "acptr", "Input byte from serial port.");
C64_KERNAL.reg(0xFFC6, "chkin", "Open channel for input.");
C64_KERNAL.reg(0xFFC9, "chkout", "Open channel for output.");
C64_KERNAL.reg(0xFFCF, "chrin", "Input character from channel.");
C64_KERNAL.reg(0xFFD2, "chrout", "Output character to channel.");
C64_KERNAL.reg(0xFFAB, "ciout", "Output byte to serial port.");
C64_KERNAL.reg(0xFF81, "lint", "Initialize screen editor.");
C64_KERNAL.reg(0xFFE7, "clall", "Close all channels and files.");
C64_KERNAL.reg(0xFFC3, "close", "Close a specified logical file.");
C64_KERNAL.reg(0xFFCC, "clrchn", "Close input and output channels.");
C64_KERNAL.reg(0xFFE4, "getin", "Get character from keyboard buffer.");
C64_KERNAL.reg(0xFFF3, "iobase", "Return base address of I/O devices.");
C64_KERNAL.reg(0xFF84, "ioinit", "Initialize input/output.");
C64_KERNAL.reg(0xFFB1, "listen", "Command devices on serial bus to LISTEN.");
C64_KERNAL.reg(0xFFD5, "load", "Load RAM from a device.");
C64_KERNAL.reg(0xFF9C, "membot", "Read/set bottom of memory.");
C64_KERNAL.reg(0xFF99, "memtop", "Read/set top of memory.");
C64_KERNAL.reg(0xFFC0, "open", "Open a logical file.");
C64_KERNAL.reg(0xFFF0, "plot", "Read/set X,Y cursor position.");
C64_KERNAL.reg(0xFF87, "ramtas", "Initialize RAM, reset tape buffer.");
C64_KERNAL.reg(0xFFDE, "rdtim", "Read realtime clock.");
C64_KERNAL.reg(0xFFB7, "readst", "Read I/O status word.");
C64_KERNAL.reg(0xFF8A, "restor", "Restore I/O default vectors.");
C64_KERNAL.reg(0xFFDE, "save", "Save RAM to device.");
C64_KERNAL.reg(0xFF9F, "scnkey", "Scan keyboard.");
C64_KERNAL.reg(0xFFED, "screen", "Return X,Y organization of screen.");
C64_KERNAL.reg(0xFF93, "second", "Send secondary address after LISTEN.");
C64_KERNAL.reg(0xFFBA, "setlfs", "Set logical, first, and second address.");
C64_KERNAL.reg(0xFF90, "setmsg", "Control Kernal messages.");
C64_KERNAL.reg(0xFFBD, "setnam", "Set filename.");
C64_KERNAL.reg(0xFFDB, "settim", "Set realtime clock.");
C64_KERNAL.reg(0xFFA2, "settmo", "Set time-out on serial bus.");
C64_KERNAL.reg(0xFFE1, "stop", "Check for STOP key.");
C64_KERNAL.reg(0xFFB4, "talk", "Command serial bus device to TALK.");
C64_KERNAL.reg(0xFF96, "tksa", "Send secondary address after TALK.");
C64_KERNAL.reg(0xFFEA, "udtim", "Increment realtime clock.");
C64_KERNAL.reg(0xFFAE, "unlsn", "Command serial bus to UNLISTEN.");
C64_KERNAL.reg(0xFFAB, "untlk", "Command serial bus to UNTALK.");
C64_KERNAL.reg(0xFF8D, "vector", "Read/set vectored I/O.");




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
        jumpTargetFetcher,
        C64_KERNAL)  // TODO add c64 symbol table
);


export {crt64Actions, C64_CRT, C64_8K_CART, C64_BASIC_PRG};
