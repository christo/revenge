// C64 specific details
// noinspection JSUnusedLocalSymbols

import {mkLabels, SymbolResolver} from "../asm/asm.js";
import {DisassemblyMeta} from "../asm/DisassemblyMeta.js";
import {DisassemblyMetaImpl, IndexedDescriptor} from "../asm/DisassemblyMetaImpl.js";
import {WordDefinitionEdict} from "../asm/instructions.js";
import {SymbolTable} from "../asm/SymbolTable.js";
import {Stench} from "../BlobSniffer.js";
import {BlobTypeSniffer} from "../BlobTypeSniffer.js";

import {Computer} from "../Computer.js";
import {KB_64} from "../core.js";
import {FileBlob} from "../FileBlob.js";
import {ArrayMemory} from "../Memory.js";
import {MemoryConfiguration} from "../MemoryConfiguration.js";
import {Mos6502} from "../mos6502.js";
import {RomImage} from "../RomImage.js";
import {CartSigEdict} from "./CartSigEdict.js";
import {CartSniffer} from "./CartSniffer.js";
import {setC64BasicPrg} from "./cbm.js";
import {Petscii} from "./petscii.js";

const BASIC_PROGRAM_START = 0x0801;
const C64_MEMORY = new MemoryConfiguration("C64 standard 64k", BASIC_PROGRAM_START);

class C64 extends Computer {
  static readonly NAME = "C64";

  constructor(memoryConfig: MemoryConfiguration = C64_MEMORY, roms: RomImage[] = []) {
    super(C64.NAME, new Mos6502(), new ArrayMemory(KB_64, Mos6502.ENDIANNESS), memoryConfig, roms, ["c64"]);
  }
}

const C64_BASIC_PRG = new BlobTypeSniffer(
    "C64 basic prg",
    "BASIC program",
    ["basic", "c64", "prg"],
    "prg",
    Mos6502.ENDIANNESS.wordToByteArray(C64_MEMORY.basicProgramStart)
);

// CRT format detailed here: https://codebase64.org/doku.php?id=base:crt_file_format
const prefix = Petscii.codes("C64 CARTRIDGE   ");
const C64_CRT = new BlobTypeSniffer("CCS64 CRT", "ROM cart format by Per Hakan Sundell", ["crt"], "crt", prefix);

/**
 * The base address for all 8kb C64 carts.
 */
const C64_8K_BASE_ADDRESS = 0x8000;

/**
 * The base address for 16kb C64 carts.
 * Turns out carts are pretty complex in c64, so this is WIP
 */
const C64_16K_BASE_ADDRESS = 0x8000;

/**
 * 16kb carts load two 8k blocks, ROML at the normal base address
 * and ROMH at this address.
 */
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

const C64_CART_MAGIC = new CartSigEdict(MAGIC_OFFSET, CBM80.length, "specified by C64 cart format");
const C64_CART_NMI_VECTOR = new WordDefinitionEdict(C64_COLD_VECTOR_OFFSET, mkLabels("resetVector"));
const C64_CART_RESET_VECTOR = new WordDefinitionEdict(C64_WARM_VECTOR_OFFSET, mkLabels("nmiVector"));

const jumpTargetFetcher: SymbolResolver = (fb: FileBlob) => [
  [fb.read16(C64_COLD_VECTOR_OFFSET), mkLabels("reset")],
  [fb.read16(C64_WARM_VECTOR_OFFSET), mkLabels("nmi")]
]

/**
 * C64 Kernal routines as SymbolTable
 */
const C64_SYM = new SymbolTable("c64");
C64_SYM.sub(0xffa5, "acptr", "Input byte from serial port");
C64_SYM.sub(0xffc6, "chkin", "Open channel for input");
C64_SYM.sub(0xffc9, "chkout", "Open channel for output");
C64_SYM.sub(0xffcf, "chrin", "Input character from channel");
C64_SYM.sub(0xffd2, "chrout", "Output character to channel");
C64_SYM.sub(0xffa8, "ciout", "Transmit a byte over the serial bus");
C64_SYM.sub(0xff81, "lint", "Initialize screen editor");
C64_SYM.sub(0xffe7, "clall", "Close all channels and files");
C64_SYM.sub(0xffc3, "close", "Close a specified logical file");
C64_SYM.sub(0xffcc, "clrchn", "Close input and output channels");
C64_SYM.sub(0xffe4, "getin", "Get character from keyboard buffer");
C64_SYM.sub(0xfff3, "iobase", "Return base address of I/O devices");
C64_SYM.sub(0xff84, "ioinit", "Initialize input/output");
C64_SYM.sub(0xffb1, "listen", "Command devices on serial bus to LISTEN");
C64_SYM.sub(0xffd5, "load", "Load RAM from a device");
C64_SYM.sub(0xff9c, "membot", "Read/set bottom of memory");
C64_SYM.sub(0xff99, "memtop", "Read/set top of memory");
C64_SYM.sub(0xffc0, "open", "Open a logical file");
C64_SYM.sub(0xfff0, "plot", "Read/set X,Y cursor position");
C64_SYM.sub(0xff87, "ramtas", "Initialize RAM, reset tape buffer");
C64_SYM.sub(0xffde, "rdtim", "Read realtime clock");
C64_SYM.sub(0xffb7, "readst", "Read I/O status word");
C64_SYM.sub(0xff8a, "restor", "Restore I/O default vectors");
C64_SYM.sub(0xffd8, "save", "Save RAM to device");
C64_SYM.sub(0xff9f, "scnkey", "Scan keyboard");
C64_SYM.sub(0xffed, "screen", "Return X,Y organization of screen");
C64_SYM.sub(0xff93, "second", "Send secondary address after LISTEN");
C64_SYM.sub(0xffba, "setlfs", "Set logical, first, and second address");
C64_SYM.sub(0xff90, "setmsg", "Control Kernal messages");
C64_SYM.sub(0xffbd, "setnam", "Set filename");
C64_SYM.sub(0xffdb, "settim", "Set realtime clock");
C64_SYM.sub(0xffa2, "settmo", "Set time-out on serial bus");
C64_SYM.sub(0xffe1, "stop", "Check for STOP key");
C64_SYM.sub(0xffb4, "talk", "Command serial bus device to TALK");
C64_SYM.sub(0xff96, "tksa", "Send secondary address after TALK");
C64_SYM.sub(0xffea, "udtim", "Increment realtime clock");
C64_SYM.sub(0xffae, "unlsn", "Command serial bus to UNLISTEN");
C64_SYM.sub(0xffab, "untlk", "Command serial bus to UNTALK");
C64_SYM.sub(0xff8d, "vector", "Read/set vectored I/O");

/** These are part of the C64 cartridge specification */
const ENTRY_POINT_OFFSETS: IndexedDescriptor[] = [
  {index: C64_COLD_VECTOR_OFFSET, name: "reset", description: "cold reset vector"},
  {index: C64_WARM_VECTOR_OFFSET, name: "nmi", description: "warm reset vector"}
];

/**
 * Detects raw 8 kb or 16 kb C64 cartridge dumps.
 */
const C64_8K16K_CART_SNIFFER = new CartSniffer(
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
        C64_SYM)
);

/**
 * CRT format - see https://rr.pokefinder.org/wiki/CRT.txt
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class C64CrtSniffer extends CartSniffer {
  private static CRT_SIG = [
    // "C64 CARTRIDGE   " 16 byte space-padded
    0x43, 0x36, 0x34, 0x20, 0x43, 0x41, 0x52, 0x54, 0x52, 0x49, 0x44, 0x47, 0x45, 0x20, 0x20, 0x20
  ];
  private static VERSION1 = new Uint8Array([0x01, 0x00]);
  private static VERSION_OFFSET = 0x14;

  constructor(dm: DisassemblyMeta) {
    super(
        "C64 crt file", "CCS64 format cartridge file from C64 cartridge",
        ["cart", C64.name],
        C64CrtSniffer.CRT_SIG,
        0,
        dm
    );
  }

  sniff(fb: FileBlob): Stench {
    // check prefix signature
    const stench = super.sniff(fb);
    if (fb.getLength() < 8194) {
      // TODO confirm there would not be crt files with binary image parts smaller than 8kb
      //   smaller carts are padded out? There may be smaller carts out there
      // pretty sure there's nothing we can do here
      return {score: stench.score * 0.1, messages: ["binary too short for C64 CRT format"]};
    }
    // TODO check header length:
    // File header length  ($00000040,  in  high/low  format,
    // calculated from offset $0000). The default  (also  the
    // minimum) value is $40.  Some  cartridges  exist  which
    // show a value of $00000020 which is wrong.

    // match version field
    let magic = stench.score;
    magic *= this.isCrtVersion1(fb) ? 3 : 0.3;
    // match hardware type; 0 is normal cartridge, don't currently support others
    magic *= this.isNormalCart(fb) ? 10 : 0.1;
    // TODO get CHIP sections of CRT format to find memory blocks to load
    return {score: magic, messages: stench.messages};
  }

  isNormalCart(fb: FileBlob) {
    return fb.submatch(new Uint8Array([0, 0]), 0x14);
  }

  isCrtVersion1(fb: FileBlob) {
    return fb.submatch(C64CrtSniffer.VERSION1, C64CrtSniffer.VERSION_OFFSET);
  }
}


// Register C64_BASIC_PRG with cbm.js to break circular dependency
setC64BasicPrg(C64_BASIC_PRG);

const C64_COMPUTER = new C64(C64_MEMORY);

export {
  C64,
  C64_CRT,
  C64_8K16K_CART_SNIFFER,
  C64_BASIC_PRG,
  C64_COMPUTER,
  C64_16K_BASE_ADDRESS,
  C64_ROMH_BASE_ADDRESS
};
