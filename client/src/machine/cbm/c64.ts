// C64 specific details
// noinspection JSUnusedLocalSymbols

import {BlobToActions, Computer, hexDumper, MemoryConfiguration, RomImage} from "../api.ts";
import {LE} from "../Endian.ts";
import {CartSniffer} from "./cbm.ts";
import {KB_64} from "../core.ts";
import {FileBlob} from "../FileBlob.ts";
import {Mos6502} from "../mos6502.ts";
import {Petscii} from "./petscii.ts";
import {DisassemblyMetaImpl, NamedOffset} from "../asm/DisassemblyMetaImpl.ts";
import {BlobTypeSniffer} from "../BlobTypeSniffer.ts";
import {ByteDefinitionEdict, VectorDefinitionEdict} from "../asm/instructions.ts";
import {LabelsComments, mkLabels, SymbolResolver, SymbolTable} from "../asm/asm.ts";
import {ArrayMemory} from "../Memory.ts";

class C64 extends Computer {
  constructor(memoryConfig: MemoryConfiguration, roms: RomImage[] = []) {
    super("C64", new Mos6502(), new ArrayMemory(KB_64, Mos6502.ENDIANNESS), memoryConfig, roms, ["c64"]);
  }
}

const C64_MEMORY = new MemoryConfiguration("C64 standard 64k", 0x0801);
const C64_BASIC_PRG = new BlobTypeSniffer(
    "C64 basic prg",
    "BASIC program",
    ["basic", "c64"],
    "prg",
    Mos6502.ENDIANNESS.wordToByteArray(C64_MEMORY.basicProgramStart)
);

// CRT format detailed here: https://codebase64.org/doku.php?id=base:crt_file_format
const prefix = Petscii.codes("C64 CARTRIDGE   ");
const C64_CRT = new BlobTypeSniffer("CCS64 CRT", "ROM cart format by Per Hakan Sundell", ["crt"], "crt", prefix);
const crt64Actions: BlobToActions = (fileBlob: FileBlob) => ({
  t: C64_CRT,
  actions: [hexDumper(fileBlob)]
});

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

const jumpTargetFetcher: SymbolResolver = (fb: FileBlob) => [
  [fb.read16(C64_COLD_VECTOR_OFFSET), mkLabels("reset")],
  [fb.read16(C64_WARM_VECTOR_OFFSET), mkLabels("nmi")]
]

/**
 * C64 Kernal routines as SymbolTable
 */
const C64_KERNAL = new SymbolTable("c64");
C64_KERNAL.sub(0xffa5, "acptr", "Input byte from serial port");
C64_KERNAL.sub(0xffc6, "chkin", "Open channel for input");
C64_KERNAL.sub(0xffc9, "chkout", "Open channel for output");
C64_KERNAL.sub(0xffcf, "chrin", "Input character from channel");
C64_KERNAL.sub(0xffd2, "chrout", "Output character to channel");
C64_KERNAL.sub(0xffa8, "ciout", "Transmit a byte over the serial bus");
C64_KERNAL.sub(0xff81, "lint", "Initialize screen editor");
C64_KERNAL.sub(0xffe7, "clall", "Close all channels and files");
C64_KERNAL.sub(0xffc3, "close", "Close a specified logical file");
C64_KERNAL.sub(0xffcc, "clrchn", "Close input and output channels");
C64_KERNAL.sub(0xffe4, "getin", "Get character from keyboard buffer");
C64_KERNAL.sub(0xfff3, "iobase", "Return base address of I/O devices");
C64_KERNAL.sub(0xff84, "ioinit", "Initialize input/output");
C64_KERNAL.sub(0xffb1, "listen", "Command devices on serial bus to LISTEN");
C64_KERNAL.sub(0xffd5, "load", "Load RAM from a device");
C64_KERNAL.sub(0xff9c, "membot", "Read/set bottom of memory");
C64_KERNAL.sub(0xff99, "memtop", "Read/set top of memory");
C64_KERNAL.sub(0xffc0, "open", "Open a logical file");
C64_KERNAL.sub(0xfff0, "plot", "Read/set X,Y cursor position");
C64_KERNAL.sub(0xff87, "ramtas", "Initialize RAM, reset tape buffer");
C64_KERNAL.sub(0xffde, "rdtim", "Read realtime clock");
C64_KERNAL.sub(0xffb7, "readst", "Read I/O status word");
C64_KERNAL.sub(0xff8a, "restor", "Restore I/O default vectors");
C64_KERNAL.sub(0xffd8, "save", "Save RAM to device");
C64_KERNAL.sub(0xff9f, "scnkey", "Scan keyboard");
C64_KERNAL.sub(0xffed, "screen", "Return X,Y organization of screen");
C64_KERNAL.sub(0xff93, "second", "Send secondary address after LISTEN");
C64_KERNAL.sub(0xffba, "setlfs", "Set logical, first, and second address");
C64_KERNAL.sub(0xff90, "setmsg", "Control Kernal messages");
C64_KERNAL.sub(0xffbd, "setnam", "Set filename");
C64_KERNAL.sub(0xffdb, "settim", "Set realtime clock");
C64_KERNAL.sub(0xffa2, "settmo", "Set time-out on serial bus");
C64_KERNAL.sub(0xffe1, "stop", "Check for STOP key");
C64_KERNAL.sub(0xffb4, "talk", "Command serial bus device to TALK");
C64_KERNAL.sub(0xff96, "tksa", "Send secondary address after TALK");
C64_KERNAL.sub(0xffea, "udtim", "Increment realtime clock");
C64_KERNAL.sub(0xffae, "unlsn", "Command serial bus to UNLISTEN");
C64_KERNAL.sub(0xffab, "untlk", "Command serial bus to UNTALK");
C64_KERNAL.sub(0xff8d, "vector", "Read/set vectored I/O");


const ENTRY_POINT_OFFSETS: NamedOffset[] = [[C64_COLD_VECTOR_OFFSET, "reset"], [C64_WARM_VECTOR_OFFSET, "nmi"]];
const C64_8K_CART = new CartSniffer(
    "C64 cart image",
    "ROM dump from C64 cartridge",
    ["cart", C64.name],
    CBM80, MAGIC_OFFSET,
    new DisassemblyMetaImpl(
        C64_8K_BASE_ADDRESS,
        ENTRY_POINT_OFFSETS,
        2, [
          C64_CART_MAGIC,
          C64_CART_RESET_VECTOR,
          C64_CART_NMI_VECTOR
        ],
        jumpTargetFetcher,
        C64_KERNAL)
);


export {crt64Actions, C64_CRT, C64_8K_CART, C64_BASIC_PRG};
