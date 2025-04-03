// VIC-20 specific details

import {Computer, LogicalLine, MemoryConfiguration, RomImage, Tag, TAG_ADDRESS, TAG_LINE_NUM} from "../api";
import {LabelsComments, mkLabels, SymbolResolver, SymbolTable} from "../asm/asm.ts";
import {Dialect} from "../asm/Dialect.ts";
import {Disassembler} from "../asm/Disassembler.ts";
import {DisassemblyMeta} from "../asm/DisassemblyMeta.ts";
import {DisassemblyMetaImpl, NamedOffset} from "../asm/DisassemblyMetaImpl";
import {ByteDeclaration, ByteDefinitionEdict, InstructionLike, VectorDefinitionEdict} from "../asm/instructions.ts";
import {BlobSniffer} from "../BlobSniffer.ts";
import {KB_64, lsb, msb} from "../core";
import {FileBlob} from "../FileBlob";
import {ArrayMemory} from "../Memory.ts";
import {Mos6502} from "../mos6502";
import {CBM_BASIC_2_0} from "./BasicDecoder.ts";
import {CartSniffer, prg} from "./cbm";
import {VIC20_BASIC_ROM} from "./vic20Basic.ts";
import {VIC20_KERNAL_ROM} from "./vic20Kernal.ts";

const VIC20_KERNAL = new SymbolTable("vic20");

// kernal jump table, yes that's how they spell it
// the underscore prefixed versions are often used though not officially recommended
// equivalents because the main api is just a jump table, each entry contains a single
// jmp $1234 and some programmers directly call a jsr to that instruction's address
// they're listed here to aid reversing such calls
VIC20_KERNAL.sub(0xff8a, "restor", "set KERNAL vectors to defaults", "contains jmp $fd52");
VIC20_KERNAL.sub(0xff8d, "vector", "Change Vectors For User", "contains jmp $fd57");
VIC20_KERNAL.sub(0xfd57, "_vector", "internal Change Vectors For User");
VIC20_KERNAL.sub(0xff90, "setmsg", "Control OS Messages", "contains jmp $fe66");
VIC20_KERNAL.sub(0xfe66, "_setmsg", "internal Control OS Messages");
VIC20_KERNAL.sub(0xff93, "secnd", "Send SA After Listen", "contains jmp $eec0");
VIC20_KERNAL.sub(0xeec0, "_secnd", "internal Send SA After Listen");
VIC20_KERNAL.sub(0xff96, "tksa", "Send SA After Talk", "contains jmp $eece");
VIC20_KERNAL.sub(0xeece, "_tksa", "internal Send SA After Talk");
VIC20_KERNAL.sub(0xff99, "memtop", "internal Set/Read System RAM Top", "contains jmp $fe73");
VIC20_KERNAL.sub(0xfe73, "_memtop", "internal Set/Read System RAM Top");
VIC20_KERNAL.sub(0xff9c, "membot", "Set/Read System RAM Bottom", "contains jmp $fe82");
VIC20_KERNAL.sub(0xfe82, "_membot", "internal Set/Read System RAM Bottom");
VIC20_KERNAL.sub(0xff9f, "scnkey", "Scan Keyboard", "contains jmp $eb1e");
VIC20_KERNAL.sub(0xeb1e, "_scnkey", "internal Scan Keyboard");
VIC20_KERNAL.sub(0xffa2, "settmo", "Set Timeout In IEEE", "contains jmp $fe6f");
VIC20_KERNAL.sub(0xfe6f, "_settmo", "internal Set Timeout In IEEE");
VIC20_KERNAL.sub(0xffa5, "acptr", "Handshake Serial Byte In", "contains jmp $ef19");
VIC20_KERNAL.sub(0xef19, "_acptr", "internal Handshake Serial Byte In");
VIC20_KERNAL.sub(0xffa8, "ciout", "Handshake Serial Byte Out", "contains jmp $eee4");
VIC20_KERNAL.sub(0xeee4, "_ciout", "internal Handshake Serial Byte Out");
VIC20_KERNAL.sub(0xffab, "untalk", "Command Serial Bus UNTALK", "contains jmp $eef6");
VIC20_KERNAL.sub(0xeef6, "_untalk", "internal Command Serial Bus UNTALK");
VIC20_KERNAL.sub(0xffae, "unlsn", "Command Serial Bus UNLISTEN", "contains jmp $ef04");
VIC20_KERNAL.sub(0xef04, "_unlsn", "internal Command Serial Bus UNLISTEN");
VIC20_KERNAL.sub(0xffb1, "listn", "Command Serial Bus LISTEN", "contains jmp $ee17");
VIC20_KERNAL.sub(0xee17, "_listn", "internal Command Serial Bus LISTEN");
VIC20_KERNAL.sub(0xffb4, "talk", "Command Serial Bus TALK", "contains jmp $ee14");
VIC20_KERNAL.sub(0xee14, "_talk", "internal Command Serial Bus TALK");
VIC20_KERNAL.sub(0xffb7, "readss", "Read I/O Status Word", "contains jmp $fe57");
VIC20_KERNAL.sub(0xfe57, "_readss", "internal Read I/O Status Word");
VIC20_KERNAL.sub(0xffba, "setlfs", "Set Logical File Parameters", "contains jmp $fe50");
VIC20_KERNAL.sub(0xfe50, "_setlfs", "internal Set Logical File Parameters");
VIC20_KERNAL.sub(0xffbd, "setnam", "Set Filename", "contains jmp $fe49");
VIC20_KERNAL.sub(0xfe49, "_setnam", "internal Set Filename");
VIC20_KERNAL.sub(0xffc0, "iopen", "Open Vector [F40A] (indirect entry)", "contains jmp ($031a)");
VIC20_KERNAL.sub(0xffc3, "iclose", "Close Vector [F34A] (indirect entry)", "contains jmp ($031c)");
VIC20_KERNAL.sub(0xffc6, "ichkin", "Set Input [F2C7] (indirect entry)", "contains jmp ($031e)");
VIC20_KERNAL.sub(0xffc9, "ichkout", "Set Output [F309] (indirect entry)", "contains jmp ($0320)");
VIC20_KERNAL.sub(0xffcc, "iclrch", "Restore I/O Vector [F353] (indirect entry)", "contains jmp ($0322)");
VIC20_KERNAL.sub(0xffcf, "ichrin", "Input Vector, chrin [F20E] (indirect entry)", "contains jmp ($0324)");
VIC20_KERNAL.sub(0xffd2, "ichrout", "Output Vector, chrout [F27A] (indirect entry) (indirect entry)", "contains jmp ($0326)");
VIC20_KERNAL.sub(0xffd5, "load", "Load RAM From Device", "contains jmp $f542");
VIC20_KERNAL.sub(0xf542, "_load", "internal Load RAM From Device");
VIC20_KERNAL.sub(0xffd8, "save", "Save RAM To Device", "contains jmp $f675");
VIC20_KERNAL.sub(0xf675, "_save", "internal Save RAM To Device");
VIC20_KERNAL.sub(0xffdb, "settim", "Set Real-Time Clock", "contains jmp $f767");
VIC20_KERNAL.sub(0xf767, "_settim", "internal Set Real-Time Clock");
VIC20_KERNAL.sub(0xffde, "rdtim", "Read Real-Time Clock", "contains jmp $f760");
VIC20_KERNAL.sub(0xf760, "_rdtim", "internal Read Real-Time Clock");
VIC20_KERNAL.sub(0xffe1, "istop", "Test-Stop Vector [F770] (indirect entry)", "contains jmp ($0328)");
VIC20_KERNAL.sub(0xffe4, "igetin", "Get From Keyboad [F1F5] (indirect entry)", "contains jmp ($032a)");
VIC20_KERNAL.sub(0xffe7, "iclall", "Close All Channels And Files [F3EF] (indirect entry)", "contains jmp ($032c)");
VIC20_KERNAL.sub(0xffea, "udtim", "Increment Real-Time Clock", "contains jmp $f734");
VIC20_KERNAL.sub(0xf73f, "_udtim", "internal Increment Real-Time Clock");
VIC20_KERNAL.sub(0xffed, "screen", "Return Screen Organization", "contains jmp $e505");
VIC20_KERNAL.sub(0xe505, "_screen", "internal Return Screen Organization");
VIC20_KERNAL.sub(0xfff0, "plot", "Read / Set Cursor X/Y Position", "contains jmp $e50a");
VIC20_KERNAL.sub(0xe50a, "_plot", "internal Read / Set Cursor X/Y Position");
VIC20_KERNAL.sub(0xfff3, "iobase", "Return I/O Base Address", "contains jmp $e500");
VIC20_KERNAL.sub(0xe500, "_iobase", "internal Return I/O Base Address");

VIC20_KERNAL.sub(0xfd52, "restor_vector", "restore kernal vectors (direct vector)");
VIC20_KERNAL.sub(0xfdf9, "ioinit_vector", "i/o initialisation (direct vector)");
VIC20_KERNAL.sub(0xe518, "screeninit_vector", "screen initialisation (direct vector)");

VIC20_KERNAL.sub(0xfd8d, "ram_init", "initialise and test RAM");
VIC20_KERNAL.sub(0xe45b, "basic_vector_init", "initialise basic vector table");
VIC20_KERNAL.sub(0xe3a4, "basic_ram_init", "initialise basic ram locations");

VIC20_KERNAL.reg(0x0316, "break_interrupt_vector", "break interrupt vector", "(fed2)");
VIC20_KERNAL.reg(0x0317, "break_interrupt_vector_msb", "break interrupt vector (MSB)");
VIC20_KERNAL.reg(0x0318, "nmi_vector", "non-maskable interrupt jump location");
VIC20_KERNAL.reg(0x0319, "nmi_vector_msb", "non-maskable interrupt jump location (MSB)");
VIC20_KERNAL.reg(0x0286, "color_mode", "characters are multi-color or single color");

/** The loading address vector is in the image at this offset. */
const CART_BASE_ADDRESS_OFFSET = 0;
/** The cold reset vector is stored at this offset. */
const CART_COLD_VECTOR_OFFSET = 2;
/** The warm reset vector (NMI) is stored at this offset. */
const CART_WARM_VECTOR_OFFSET = 4;

/**
 * Offset of the cartridge signature.
 * 2 bytes for the load address,
 * 2 for the reset vector,
 * 2 for the nmi vector.
 */
const CART_SIG_OFFSET = 6;

/**
 * VIC-20 cartridge magic signature A0CBM in petscii where
 * CBM is in reverse video (&70).
 */
const A0CBM = [0x41, 0x30, 0xc3, 0xc2, 0xcd];

/**
 * SymbolResolver which supplies VIC-20 reset (cold) and nmi (warm) reset vectors declared in the
 * cart image defined by fb.
 */
const VIC_20_CART_VECTORS: SymbolResolver = (fb: FileBlob) => [
  [fb.readVector(CART_COLD_VECTOR_OFFSET), new LabelsComments("reset", "main entry point")],
  [fb.readVector(CART_WARM_VECTOR_OFFSET), new LabelsComments("nmi", "jump target on restore key")]
];

class PetsciiDeclaration extends ByteDeclaration {
  constructor(bytes: number[], lc: LabelsComments) {
    super(bytes, lc);
  }

  disassemble = (dialect: Dialect, dis: Disassembler): Tag[] => {
    return dialect.text(this, dis);
  };
}

class CartSigEdict extends ByteDefinitionEdict {

  constructor() {
    super(CART_SIG_OFFSET, A0CBM.length, new LabelsComments("cartSig", "specified by VIC-20 cart format"));
  }

  create(fb: FileBlob): InstructionLike {
    const bytes = fb.getBytes().slice(this.offset, this.offset + this.length);
    return new PetsciiDeclaration(bytes, this.lc);
  }

  describe(): string {
    return `VIC-20 cart signature`;
  }
}

const CART_JUMP_POINT_OFFSETS: NamedOffset[] = [
  [CART_COLD_VECTOR_OFFSET, "reset"],
  [CART_WARM_VECTOR_OFFSET, "nmi"]
];

/**
 * Common load addresses for machine language cartridge images on VIC-20.
 * TODO add common sizes; cartridge dumps are always round kilobyte multiples, say of 4k?
 */
const POPULAR_CART_LOAD_ADDRS = [
  prg([0x00, 0x40]),  // 0x4000
  prg([0x00, 0x60]),  // 0x6000
  prg([0x00, 0x80]),  // 0x8000
  prg([0x00, 0xa0]),  // 0xa000
  prg([0x00, 0xc0]),  // 0xc000
];

/** where kernal rom image is mapped */
const VIC_20_KERNAL_LOCATION = [0xe000, 0xffff];
/** where basic rom image is mapped */
const VIC_20_BASIC_LOCATION = [0xc000, 0xdfff];

// TODO need way to load rom image in browser or server
//   maybe embed in client, later enable upload from browser
let VIC_ROMS = [
  new RomImage("VIC-20 Kernal ROM", VIC_20_KERNAL_LOCATION[0], VIC20_KERNAL_ROM),
  new RomImage("VIC-20 BASIC ROM", VIC_20_BASIC_LOCATION[0], VIC20_BASIC_ROM),
];

class Vic20 extends Computer {
  static NAME = "VIC-20";

  static MEMORY_CONFIG = {
    UNEX: new MemoryConfiguration("VIC-20 unexpanded", 0x1001, "unexpanded"),
    EXP03K: new MemoryConfiguration("VIC-20 3k expansion", 0x401, "3k"),
    EXP08K: new MemoryConfiguration("VIC-20 8k expansion", 0x1201, "8k"),
    EXP16K: new MemoryConfiguration("VIC-20 16k expansion", 0x1201, "16k"),
    EXP24K: new MemoryConfiguration("VIC-20 24k expansion", 0x1201, "24k"),
    EXP35K: new MemoryConfiguration("VIC-20 35k expansion", 0x1201, "35k"),
  };

  /**
   * Common memory configs.
   */
  static MEMORY_CONFIGS = [
    Vic20.MEMORY_CONFIG.UNEX,
    Vic20.MEMORY_CONFIG.EXP03K,
    Vic20.MEMORY_CONFIG.EXP08K,
    Vic20.MEMORY_CONFIG.EXP16K,
    Vic20.MEMORY_CONFIG.EXP24K,
    Vic20.MEMORY_CONFIG.EXP35K,
  ];

  static BASIC_LOAD_PRGS = Vic20.MEMORY_CONFIGS.map(mc => {
    prg(mc.basicProgramStart)
  });

  constructor(memConfig: MemoryConfiguration, roms: RomImage[] = VIC_ROMS) {
    super(Vic20.NAME, new Mos6502(), new ArrayMemory(KB_64, Mos6502.ENDIANNESS), memConfig, roms, [Vic20.NAME]);
  }
}


/**
 * Detects Vic-20 BASIC
 */
class Vic20BasicSniffer implements BlobSniffer {

  desc: string;
  name: string;
  tags: string[];
  private memory: MemoryConfiguration;

  constructor(memory: MemoryConfiguration) {
    this.memory = memory;
    this.desc = `VIC-20 BASIC (${memory.shortName})`;
    this.name = "BASIC prg";
    this.tags = ["basic", "vic20", memory.shortName];
  }

  getMeta(): DisassemblyMeta {
    return DisassemblyMetaImpl.NULL_DISSASSEMBLY_META;
  }

  sniff(fb: FileBlob): number {
    // check if the start address bytes match the basic load address for our MemoryConfiguration
    const byte0Match = fb.getBytes()[0] === lsb(this.memory.basicProgramStart);
    const byte1Match = fb.getBytes()[1] === msb(this.memory.basicProgramStart);
    let isBasic = (byte0Match && byte1Match) ? 1.2 : 0.8; // score for matching or not

    // try decoding it as basic
    try {
      const decoded = CBM_BASIC_2_0.decode(fb.asEndian());
      let lastNum = -1;
      let lastAddr = -1;
      let byteCount = 0;
      decoded.getLines().forEach((ll: LogicalLine) => {
        const i: Tag[] = ll.getTags();
        // BasicDecoder puts this tag on lines1
        const lnumStr = i.find(t => t.hasTag(TAG_LINE_NUM));
        let addrStr = i.find(t => t.hasTag(TAG_ADDRESS));
        if (lnumStr !== undefined && addrStr !== undefined) {
          let thisNum = parseInt(lnumStr.value);
          if (lastNum !== -1 && lastNum >= thisNum) {
            // decrease in basic line numbers
            console.log(`decrease in basic line numbers for ${fb.name}`)
            isBasic *= 0.5;
          }
          if (lastAddr !== -1 && lastAddr >= parseInt(addrStr.value, 16)) {
            // next line address is allegedly lower? This ain't basic
            console.log(`lower next line address for ${fb.name}`)
            isBasic *= 0.3;
          }
          lastNum = thisNum;
          byteCount += ll.getByteSize();
        } else {
          // maybe a machine language block that follows
          const basicSize = byteCount;
          // how much remains?
          const remainingSize = fb.getLength() - basicSize;
          // is the basic tiny?
          if (basicSize < 20 && remainingSize > basicSize) {
            // almost certain we should treat this as machine code at this point
            // although it could be data that a basic program simply reads.
            isBasic *= 0.001;
          } else {
            console.log(`basic decoder: basicSize ${basicSize} remainingSize: ${remainingSize}`);
          }
          // is it a simple sys command?

          // not a basic line
          // for now leave this because hybrid files we still want to interpret as BASIC until we have hybrid rendering
        }
      });
    } catch (e) {
      // if we exploded, it's not BASIC!
      // console.error(e);
      isBasic = 0.01;
    }
    return isBasic;
  }
}

const UNEXPANDED_VIC_BASIC = new Vic20BasicSniffer(Vic20.MEMORY_CONFIG.UNEX);
const EXP03K_VIC_BASIC = new Vic20BasicSniffer(Vic20.MEMORY_CONFIG.EXP03K);
const EXP08K_VIC_BASIC = new Vic20BasicSniffer(Vic20.MEMORY_CONFIG.EXP08K);
const EXP16K_VIC_BASIC = new Vic20BasicSniffer(Vic20.MEMORY_CONFIG.EXP16K);
const EXP24K_VIC_BASIC = new Vic20BasicSniffer(Vic20.MEMORY_CONFIG.EXP24K);

/**
 * VIC-20 cart image sniffer. Currently only handles single contiguous mapped-regions.
 */
const VIC20_CART_SNIFFER = new CartSniffer(
    "VIC-20 cart image",
    "ROM dump from VIC-20 cartridge",
    ["cart", Vic20.NAME],
    A0CBM, CART_SIG_OFFSET,
    new DisassemblyMetaImpl(
        CART_BASE_ADDRESS_OFFSET,
        CART_JUMP_POINT_OFFSETS,
        2,
        [
          new CartSigEdict(),
          new VectorDefinitionEdict(CART_BASE_ADDRESS_OFFSET, mkLabels("cartBase")),
          new VectorDefinitionEdict(CART_COLD_VECTOR_OFFSET, mkLabels("resetVector")),
          new VectorDefinitionEdict(CART_WARM_VECTOR_OFFSET, mkLabels("nmiVector")),
        ], VIC_20_CART_VECTORS,
        VIC20_KERNAL
    )
);


export {
  Vic20,
  POPULAR_CART_LOAD_ADDRS,
  VIC20_CART_SNIFFER,
  UNEXPANDED_VIC_BASIC,
  EXP03K_VIC_BASIC,
  EXP08K_VIC_BASIC,
  EXP16K_VIC_BASIC,
  EXP24K_VIC_BASIC,
  VIC20_KERNAL,
}