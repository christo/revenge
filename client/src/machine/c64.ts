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
C64_KERNAL.reg(0xFFA5, "ACPTR", "Input byte from serial port.");
C64_KERNAL.reg(0xFFC6, "CHKIN", "Open channel for input.");
C64_KERNAL.reg(0xFFC9, "CHKOUT", "Open channel for output.");
C64_KERNAL.reg(0xFFCF, "CHRIN", "Input character from channel.");
C64_KERNAL.reg(0xFFD2, "CHROUT", "Output character to channel.");
C64_KERNAL.reg(0xFFAB, "CIOUT", "Output byte to serial port.");
C64_KERNAL.reg(0xFF81, "LINT", "Initialize screen editor.");
C64_KERNAL.reg(0xFFE7, "CLALL", "Close all channels and files.");
C64_KERNAL.reg(0xFFC3, "CLOSE", "Close a specified logical file.");
C64_KERNAL.reg(0xFFCC, "CLRCHN", "Close input and output channels.");
C64_KERNAL.reg(0xFFE4, "GETIN", "Get character from keyboard buffer.");
C64_KERNAL.reg(0xFFF3, "IOBASE", "Return base address of I/O devices.");
C64_KERNAL.reg(0xFF84, "IOINIT", "Initialize input/output.");
C64_KERNAL.reg(0xFFB1, "LISTEN", "Command devices on serial bus to LISTEN.");
C64_KERNAL.reg(0xFFD5, "LOAD", "Load RAM from a device.");
C64_KERNAL.reg(0xFF9C, "MEMBOT", "Read/set bottom of memory.");
C64_KERNAL.reg(0xFF99, "MEMTOP", "Read/set top of memory.");
C64_KERNAL.reg(0xFFC0, "OPEN", "Open a logical file.");
C64_KERNAL.reg(0xFFF0, "PLOT", "Read/set X,Y cursor position.");
C64_KERNAL.reg(0xFF87, "RAMTAS", "Initialize RAM, reset tape buffer.");
C64_KERNAL.reg(0xFFDE, "RDTIM", "Read realtime clock.");
C64_KERNAL.reg(0xFFB7, "READST", "Read I/O status word.");
C64_KERNAL.reg(0xFF8A, "RESTOR", "Restore I/O default vectors.");
C64_KERNAL.reg(0xFFDE, "SAVE", "Save RAM to device.");
C64_KERNAL.reg(0xFF9F, "SCNKEY", "Scan keyboard.");
C64_KERNAL.reg(0xFFED, "SCREEN", "Return X,Y organization of screen.");
C64_KERNAL.reg(0xFF93, "SECOND", "Send secondary address after LISTEN.");
C64_KERNAL.reg(0xFFBA, "SETLFS", "Set logical, first, and second address.");
C64_KERNAL.reg(0xFF90, "SETMSG", "Control Kernal messages.");
C64_KERNAL.reg(0xFFBD, "SETNAM", "Set filename.");
C64_KERNAL.reg(0xFFDB, "SETTIM", "Set realtime clock.");
C64_KERNAL.reg(0xFFA2, "SETTMO", "Set time-out on serial bus.");
C64_KERNAL.reg(0xFFE1, "STOP", "Check for STOP key.");
C64_KERNAL.reg(0xFFB4, "TALK", "Command serial bus device to TALK.");
C64_KERNAL.reg(0xFF96, "TKSA", "Send secondary address after TALK.");
C64_KERNAL.reg(0xFFEA, "UDTIM", "Increment realtime clock.");
C64_KERNAL.reg(0xFFAE, "UNLSN", "Command serial bus to UNLISTEN.");
C64_KERNAL.reg(0xFFAB, "UNTLK", "Command serial bus to UNTALK.");
C64_KERNAL.reg(0xFF8D, "VECTOR", "Read/set vectored I/O.");




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
