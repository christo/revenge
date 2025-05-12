/*
VIC-20 specific details: machine definition, memory configs, kernel images, symbols, binary sniffers etc.
 */

import {LabelsComments, mkLabels, SymbolResolver} from "../asm/asm.js";
import {DisassemblyMetaImpl, IndexedDescriptor} from "../asm/DisassemblyMetaImpl.js";
import {WordDefinitionEdict} from "../asm/instructions.js";
import {SymbolTable} from "../asm/SymbolTable.js";
import {Computer} from "../Computer.js";
import {KB_64} from "../core.js";
import {LE} from "../Endian.js";
import {FileBlob} from "../FileBlob.js";
import {ArrayMemory} from "../Memory.js";
import {MemoryConfiguration} from "../MemoryConfiguration.js";
import {Mos6502} from "../mos6502.js";
import {RomImage} from "../RomImage.js";
import {CartSigEdict} from "./CartSigEdict.js";
import {CartSniffer} from "./CartSniffer.js";
import {prg} from "./cbm.js";
import {CbmBasicSniffer} from "./CbmBasicSniffer.js";
import {VIC20_BASIC_ROM} from "./vic20Basic.js";
import {VIC20_KERNAL_ROM} from "./vic20Kernal.js";

const VIC20_SYM = new SymbolTable("VIC-20");

// kernal jump table, yes that's how they spell it
// the underscore prefixed versions are often used though not officially recommended
// equivalents because the main api is just a jump table, each entry contains a single
// jmp $1234 and some programmers directly call a jsr to that instruction's address
// they're listed here to aid reversing such calls
VIC20_SYM.sub(0xff8a, "restor", "set KERNAL vectors to defaults", "contains jmp $fd52");
VIC20_SYM.sub(0xff8d, "vector", "Change Vectors For User", "contains jmp $fd57");
VIC20_SYM.sub(0xfd57, "_vector", "internal Change Vectors For User");
VIC20_SYM.sub(0xff90, "setmsg", "Control OS Messages", "contains jmp $fe66");
VIC20_SYM.sub(0xfe66, "_setmsg", "internal Control OS Messages");
VIC20_SYM.sub(0xff93, "secnd", "Send SA After Listen", "contains jmp $eec0");
VIC20_SYM.sub(0xeec0, "_secnd", "internal Send SA After Listen");
VIC20_SYM.sub(0xff96, "tksa", "Send SA After Talk", "contains jmp $eece");
VIC20_SYM.sub(0xeece, "_tksa", "internal Send SA After Talk");
VIC20_SYM.sub(0xff99, "memtop", "internal Set/Read System RAM Top", "contains jmp $fe73");
VIC20_SYM.sub(0xfe73, "_memtop", "internal Set/Read System RAM Top");
VIC20_SYM.sub(0xff9c, "membot", "Set/Read System RAM Bottom", "contains jmp $fe82");
VIC20_SYM.sub(0xfe82, "_membot", "internal Set/Read System RAM Bottom");
VIC20_SYM.sub(0xff9f, "scnkey", "Scan Keyboard", "contains jmp $eb1e");
VIC20_SYM.sub(0xeb1e, "_scnkey", "internal Scan Keyboard");
VIC20_SYM.sub(0xffa2, "settmo", "Set Timeout In IEEE", "contains jmp $fe6f");
VIC20_SYM.sub(0xfe6f, "_settmo", "internal Set Timeout In IEEE");
VIC20_SYM.sub(0xffa5, "acptr", "Handshake Serial Byte In", "contains jmp $ef19");
VIC20_SYM.sub(0xef19, "_acptr", "internal Handshake Serial Byte In");
VIC20_SYM.sub(0xffa8, "ciout", "Handshake Serial Byte Out", "contains jmp $eee4");
VIC20_SYM.sub(0xeee4, "_ciout", "internal Handshake Serial Byte Out");
VIC20_SYM.sub(0xffab, "untalk", "Command Serial Bus UNTALK", "contains jmp $eef6");
VIC20_SYM.sub(0xeef6, "_untalk", "internal Command Serial Bus UNTALK");
VIC20_SYM.sub(0xffae, "unlsn", "Command Serial Bus UNLISTEN", "contains jmp $ef04");
VIC20_SYM.sub(0xef04, "_unlsn", "internal Command Serial Bus UNLISTEN");
VIC20_SYM.sub(0xffb1, "listn", "Command Serial Bus LISTEN", "contains jmp $ee17");
VIC20_SYM.sub(0xee17, "_listn", "internal Command Serial Bus LISTEN");
VIC20_SYM.sub(0xffb4, "talk", "Command Serial Bus TALK", "contains jmp $ee14");
VIC20_SYM.sub(0xee14, "_talk", "internal Command Serial Bus TALK");
VIC20_SYM.sub(0xffb7, "readss", "Read I/O Status Word", "contains jmp $fe57");
VIC20_SYM.sub(0xfe57, "_readss", "internal Read I/O Status Word");
VIC20_SYM.sub(0xffba, "setlfs", "Set Logical File Parameters", "contains jmp $fe50");
VIC20_SYM.sub(0xfe50, "_setlfs", "internal Set Logical File Parameters");
VIC20_SYM.sub(0xffbd, "setnam", "Set Filename", "contains jmp $fe49");
VIC20_SYM.sub(0xfe49, "_setnam", "internal Set Filename");
VIC20_SYM.sub(0xffc0, "iopen", "Open Vector [F40A] (indirect entry)", "contains jmp ($031a)");
VIC20_SYM.sub(0xffc3, "iclose", "Close Vector [F34A] (indirect entry)", "contains jmp ($031c)");
VIC20_SYM.sub(0xffc6, "ichkin", "Set Input [F2C7] (indirect entry)", "contains jmp ($031e)");
VIC20_SYM.sub(0xffc9, "ichkout", "Set Output [F309] (indirect entry)", "contains jmp ($0320)");
VIC20_SYM.sub(0xffcc, "iclrch", "Restore I/O Vector [F353] (indirect entry)", "contains jmp ($0322)");
VIC20_SYM.sub(0xffcf, "ichrin", "Input Vector, chrin [F20E] (indirect entry)", "contains jmp ($0324)");
VIC20_SYM.sub(0xffd2, "ichrout", "Output Vector, chrout [F27A] (indirect entry) (indirect entry)", "contains jmp ($0326)");
VIC20_SYM.sub(0xffd5, "load", "Load RAM From Device", "contains jmp $f542");
VIC20_SYM.sub(0xf542, "_load", "internal Load RAM From Device");
VIC20_SYM.sub(0xffd8, "save", "Save RAM To Device", "contains jmp $f675");
VIC20_SYM.sub(0xf675, "_save", "internal Save RAM To Device");
VIC20_SYM.sub(0xffdb, "settim", "Set Real-Time Clock", "contains jmp $f767");
VIC20_SYM.sub(0xf767, "_settim", "internal Set Real-Time Clock");
VIC20_SYM.sub(0xffde, "rdtim", "Read Real-Time Clock", "contains jmp $f760");
VIC20_SYM.sub(0xf760, "_rdtim", "internal Read Real-Time Clock");
VIC20_SYM.sub(0xffe1, "istop", "Test-Stop Vector [F770] (indirect entry)", "contains jmp ($0328)");
VIC20_SYM.sub(0xffe4, "igetin", "Get From Keyboad [F1F5] (indirect entry)", "contains jmp ($032a)");
VIC20_SYM.sub(0xffe7, "iclall", "Close All Channels And Files [F3EF] (indirect entry)", "contains jmp ($032c)");
VIC20_SYM.sub(0xffea, "udtim", "Increment Real-Time Clock", "contains jmp $f734");
VIC20_SYM.sub(0xf73f, "_udtim", "internal Increment Real-Time Clock");
VIC20_SYM.sub(0xffed, "screen", "Return Screen Organization", "contains jmp $e505");
VIC20_SYM.sub(0xe505, "_screen", "internal Return Screen Organization");
VIC20_SYM.sub(0xfff0, "plot", "Read / Set Cursor X/Y Position", "contains jmp $e50a");
VIC20_SYM.sub(0xe50a, "_plot", "internal Read / Set Cursor X/Y Position");
VIC20_SYM.sub(0xfff3, "iobase", "Return I/O Base Address", "contains jmp $e500");
VIC20_SYM.sub(0xe500, "_iobase", "internal Return I/O Base Address");

VIC20_SYM.sub(0xfd52, "restor_vector", "restore kernal vectors (direct vector)");
VIC20_SYM.sub(0xfdf9, "ioinit_vector", "i/o initialisation (direct vector)");
VIC20_SYM.sub(0xe518, "screeninit_vector", "screen initialisation (direct vector)");

VIC20_SYM.sub(0xfd8d, "ram_init", "initialise and test RAM");
VIC20_SYM.sub(0xe45b, "basic_vector_init", "initialise basic vector table");
VIC20_SYM.sub(0xe3a4, "basic_ram_init", "initialise basic ram locations");

// TODO it would be useful to set address ranges to describe regions

/*
 * Common Registers and locations
 */
VIC20_SYM.reg(0x0281, "MSMSTR", "Pointer to start of user RAM")
VIC20_SYM.reg(0x0282, "MSMSTR_MSB", "MSB Pointer to start of user RAM")
VIC20_SYM.reg(
    0x0286,
    "color_mode",
    "character foreground are multi-color or single color",
    `bits 0-2 choose foreground colour from standard 8 as on the keyboard, 
  bit 3 sets multi-colour mode`);
VIC20_SYM.reg(0x0287, "cursor_color", "colour at current cursor position");
VIC20_SYM.reg(0x0288, "screen_map_page", "MSB of screen map address");

// keyboard related
VIC20_SYM.reg(0x0289, "XMAX", "Maximum number of characters in the keyboard buffer");
VIC20_SYM.reg(0x028a, "RPTFLG", "Keyboard repeater flags");
VIC20_SYM.reg(0x028b, "KOUNT", "Delay before other than first repeat of key");
VIC20_SYM.reg(0x028c, "DELAY", "Delay before first repeat of key");
VIC20_SYM.reg(0x028d, "SHFLAG", "Current SHIFT/CTRL/C= keys pattern");
VIC20_SYM.reg(0x028e, "LSTSHF", "Previous SHIFT/CTRL/C= keys pattern");
VIC20_SYM.reg(0x028f, "KEYLOG", "Pointer to the default keyboard table setup routine");
VIC20_SYM.reg(0x0290, "KEYLOG_MSB", "MSB of pointer to the default keyboard table setup routine");
VIC20_SYM.reg(0x0291, "MODE", "Flag to disable or enable combined SHIFT and Commodore keys",
    "Only affects the special behaviour of combined SHIFT + C= keys");

VIC20_SYM.reg(0x0292, "AUTODN", "0 enables scroll down, any other value disables");

VIC20_SYM.reg(0x0300, "IERROR", "Vector to routine to print BASIC error message from a table");
VIC20_SYM.reg(0x0301, "IERROR_MSB", "MSB of vector to routine to print BASIC error message from a table");
VIC20_SYM.reg(0x0302, "IMAIN", "Vector to the BASIC main routine. Execute or store statement");
VIC20_SYM.reg(0x0303, "IMAIN_MSB", "MSB of vector to the BASIC main routine. Execute or store statement",
    "Points to the MAIN routine at 50307 ($C483)");
VIC20_SYM.reg(0x0304, "ICRNCH", "Vector to the BASIC tokenization routine.",
    "Points to the CRNCH routine at 50556 ($C57C)");
VIC20_SYM.reg(0x0305, "ICRNCH_MSB", "MSB of vector to the BASIC tokenization routine.");
VIC20_SYM.reg(0x0306, "IQPLOP", "Vector to the BASIC routine that expands and prints tokens.",
    "Points to the QPLOP routine at 50970 ($C71A)");
VIC20_SYM.reg(0x0307, "IQPLOP_MSB", "MSB of vector to the BASIC routine that expands and prints tokens.");
VIC20_SYM.reg(0x0308, "IQGONE", "Vector to the BASIC routine that executes the next BASIC token.",
    "Points to the CRNCH routine at 51172 ($C7E4)");
VIC20_SYM.reg(0x0309, "IGONE_MSB", "MSB of vector to the BASIC routine that executes the next BASIC token.");
VIC20_SYM.reg(0x030a, "IEVAL", "Vector to the BASIC routine that evaluates a variable.",
    "Points to the EVAL routine at 52870 ($CE86)");
VIC20_SYM.reg(0x030b, "IEVAL_MSB", "MSB of vector to the BASIC routine that evaluates a variable.");

VIC20_SYM.reg(0x030c, "SAREG", "Save 6502 A register before BASIC SYS statement.");
VIC20_SYM.reg(0x030d, "SXREG", "Save 6502 X register before BASIC SYS statement.");
VIC20_SYM.reg(0x030e, "SYREG", "Save 6502 Y register before BASIC SYS statement.");
VIC20_SYM.reg(0x030f, "SPREG", "Save 6502 P register before BASIC SYS statement.",
    "Bit flag map: NV_BDIZC");

VIC20_SYM.reg(0x0314, "CINV", "IRQ interrupt vector", "Vector to IRQ interrupt routine. Default is 60095 ($EABF)");
VIC20_SYM.reg(0x0315, "CINV_MSB", "MSB of IRQ interrupt vector");
VIC20_SYM.reg(0x0316, "break_interrupt_vector", "break interrupt vector", "When STOP key is pressed (fed2)");
VIC20_SYM.reg(0x0317, "break_interrupt_vector_msb", "break interrupt vector (MSB)");
VIC20_SYM.reg(0x0318, "nmi_vector", "non-maskable interrupt jump location");
VIC20_SYM.reg(0x0319, "nmi_vector_msb", "non-maskable interrupt jump location (MSB)");

VIC20_SYM.reg(0x033c, "TPHDRID", "Tape header identifier, start of tape buffer");
VIC20_SYM.reg(0x033d, "TPHBGN", "Starting address for tape load");
VIC20_SYM.reg(0x033e, "TPHBGN_MSB", "MSB of starting address for tape load");
VIC20_SYM.reg(0x033f, "TPHEND", "Ending address plus one of tape load");
VIC20_SYM.reg(0x0340, "TPHEND_MSB", "MSB of ending address plus one of tape load");
VIC20_SYM.reg(0x0341, "TPHNAME", "Filename of tape data",
    "Padded with blanks, these 187 bytes hold the filename that is specified with SAVE, OPEN, or SETNAM.)");


// VIC REGISTERS
VIC20_SYM.reg(0x9000, "VICCR0", "Left edge of video image and interlace switch");
VIC20_SYM.reg(0x9001, "VICCR1", "Vertical origin of video image");
VIC20_SYM.reg(0x9002, "VICCR2", "Number of text columns");
VIC20_SYM.reg(0x9003, "VICCR3", "Number of text lines");
VIC20_SYM.reg(0x9004, "VICCR4", "Raster beam location bits 8-1");
VIC20_SYM.reg(0x9005, "VICCR5", "Screen map and character map addresses");
VIC20_SYM.reg(0x9006, "VICCR6", "Light pen horizontal screen location");
VIC20_SYM.reg(0x9007, "VICCR7", "Light pen vertical screen location");
VIC20_SYM.reg(0x9008, "VICCR8", "Paddle X value");
VIC20_SYM.reg(0x9009, "VICCR9", "Paddle Y value");
VIC20_SYM.reg(0x900a, "VICCRA", "Sound oscillator 1 (bass) relative frequency");
VIC20_SYM.reg(0x900b, "VICCRB", "Sound oscillator 2 (alto) relative frequency");
VIC20_SYM.reg(0x900c, "VICCRC", "Sound oscillator 3 (soprano) relative frequency");
VIC20_SYM.reg(0x900d, "VICCRD", "Sound oscillator 4 (noise) relative frequency");
VIC20_SYM.reg(0x900e, "VICCRE", "Sound volume and aux colour");
VIC20_SYM.reg(0x900f, "VICCRF", "Background colour, border colour, inverse colour switch");

// VIA registers
VIC20_SYM.reg(0x9110, "VIA1PB", "VIA 1 I/O Port B - User port");
VIC20_SYM.reg(0x9111, "VIA1PA1", "VIA 1 I/O Port A - Serial port and joystick port");
VIC20_SYM.reg(0x9112, "VIA1DDRB", "VIA 1 I/O Port B Direction Register");
VIC20_SYM.reg(0x9113, "VIA1DDRA", "VIA 1 I/O Port A Direction Register");
VIC20_SYM.reg(0x9114, "VIA1T1CL", "VIA 1 Timer 1 count LSB");
VIC20_SYM.reg(0x9116, "VIA1T1LL", "VIA 1 Timer 1 latch LSB");
VIC20_SYM.reg(0x9117, "VIA1T1LH", "VIA 1 Timer 1 latch MSB");
VIC20_SYM.reg(0x9118, "VIA1T2CL", "VIA 1 Timer 2 count and latch LSB");
VIC20_SYM.reg(0x9119, "VIA1T2CH", "VIA 1 Timer 2 count and latch MSB");
VIC20_SYM.reg(0x911a, "VIA1SR", "VIA 1 Shift Register for parallel and serial communication");
VIC20_SYM.reg(0x911b, "VIA1CR", "VIA 1 Aux Control Register - for timers and shift register");
VIC20_SYM.reg(0x911c, "VIA1PCR", "VIA 1 Peripheral Control Register - for handshaking");
VIC20_SYM.reg(0x911d, "VIA1IFR", "VIA 1 Interrupt Flag Register - for IRQs NMI bits 1-6");
VIC20_SYM.reg(0x911e, "VIA1IER", "VIA 1 Interrupt Enable Register");
VIC20_SYM.reg(0x911f, "VIA1PA2", "Mirror of VIA 1 Port A I/O Register VIA1PA1 ($9111)");
VIC20_SYM.reg(0x9120, "VIA2PB", "VIA 2 Port B I/O Register - keyboard column scan");
VIC20_SYM.reg(0x9121, "VIA2PA1", "VIA 2 Port B I/O Register - keyboard row scan");
VIC20_SYM.reg(0x9122, "VIA2DDRB", "VIA 2 I/O Port B Direction Register");
VIC20_SYM.reg(0x9123, "VIA2DDRA", "VIA 2 I/O Port A Direction Register");
VIC20_SYM.reg(0x9124, "VIA2T1CL", "VIA 2 Timer 1 count LSB");
VIC20_SYM.reg(0x9126, "VIA2T1LL", "VIA 2 Timer 1 latch LSB");
VIC20_SYM.reg(0x9127, "VIA2T1LH", "VIA 2 Timer 1 latch MSB");
VIC20_SYM.reg(0x9128, "VIA2T2CL", "VIA 2 Timer 2 count and latch LSB");
VIC20_SYM.reg(0x9129, "VIA2T2CH", "VIA 2 Timer 2 count and latch MSB");
VIC20_SYM.reg(0x912a, "VIA2SR", "VIA 2 Shift Register for parallel and serial communication",
    "Kernal does not use this shift register. Can only be be used for user port");
VIC20_SYM.reg(0x912b, "VIA2CR", "VIA 2 Aux Control Register - for timers and shift register",
    "Default value set by Kernal is 64 ($40)");
VIC20_SYM.reg(0x912c, "VIA2PCR", "VIA 2 Peripheral Control Register - for handshaking",
    "Default value set by Kernal is 222 ($de)");
VIC20_SYM.reg(0x912d, "VIA2IFR", "VIA 2 Interrupt Flag Register - for IRQs NMI bits 1-6");
VIC20_SYM.reg(0x912e, "VIA2IER", "VIA 2 Interrupt Enable Register");
VIC20_SYM.reg(0x912f, "VIA2PA2", "Mirror of VIA 2 Port A I/O Register VIA2PA1 ($9121)");


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

const CART_JUMP_POINT_OFFSETS: IndexedDescriptor[] = [
  // TODO fix code duplication
  {index: CART_COLD_VECTOR_OFFSET, name: "reset", description: "cold reset vector"},
  {index: CART_WARM_VECTOR_OFFSET, name: "nmi", description: "warm reset vector"},

];

/**
 * SymbolResolver which supplies VIC-20 reset (cold) and nmi (warm) reset vectors declared in the
 * cart image defined by fb.
 */
const VIC_20_CART_VECTORS: SymbolResolver = (fb: FileBlob) => [
  [fb.readVector(CART_COLD_VECTOR_OFFSET), new LabelsComments("reset", "main entry point")],
  [fb.readVector(CART_WARM_VECTOR_OFFSET), new LabelsComments("nmi", "jump target on restore key")]
];

const COMMON_CART_LOAD_ADDRESSES = [
  0x4000,
  0x6000,
  0x8000,
  0xa000,
  0xc000,
];

/**
 * Common load addresses for machine language cartridge images on VIC-20.
 * TODO add common sizes; cartridge dumps are always round kilobyte multiples, say of 4k?
 */
const VIC_CART_ADDRS = COMMON_CART_LOAD_ADDRESSES.map(a => prg(LE.wordToTwoBytes(a)));

/** where kernal rom image is mapped */
const VIC_20_KERNAL_LOCATION = [0xe000, 0xffff];
/** where basic rom image is mapped */
const VIC_20_BASIC_LOCATION = [0xc000, 0xdfff];

const VIC_ROMS = [
  new RomImage("VIC-20 Kernal ROM", VIC_20_KERNAL_LOCATION[0], VIC20_KERNAL_ROM),
  new RomImage("VIC-20 BASIC ROM", VIC_20_BASIC_LOCATION[0], VIC20_BASIC_ROM),
];

class Vic20 extends Computer {
  static NAME = "VIC-20";
  static LONG_NAME = "Commodore VIC-20"

  // future: add screen and colour memory relocation for 8k, 16k, 24k, 32k
  static MEM_CONFIG = {
    UNEX: new MemoryConfiguration("Unexpanded", 0x1001, "unexpanded"),
    EXP03K: new MemoryConfiguration("3k expansion", 0x401, "3k"),
    EXP08K: new MemoryConfiguration("8k expansion", 0x1201, "8k"),
    EXP16K: new MemoryConfiguration("16k expansion", 0x1201, "16k"),
    EXP24K: new MemoryConfiguration("24k expansion", 0x1201, "24k"),
    EXP32K: new MemoryConfiguration("32k expansion", 0x1201, "32k"),
    EXP35K: new MemoryConfiguration("35k expansion", 0x401, "35k"), // note basic location is same as 3k
  };

  /**
   * Common memory configs. Does not currently distinguish each block mapping permutation.
   */
  static MEMORY_CONFIGS = [
    Vic20.MEM_CONFIG.UNEX,
    Vic20.MEM_CONFIG.EXP03K,
    Vic20.MEM_CONFIG.EXP08K,
    Vic20.MEM_CONFIG.EXP16K,
    Vic20.MEM_CONFIG.EXP24K,
    Vic20.MEM_CONFIG.EXP32K,
    Vic20.MEM_CONFIG.EXP35K,
  ];

  /**
   * Create a BlobTypeSniffer for each VIC memory configuration.
   */
  static BASIC_LOAD_PRGS = Vic20.MEMORY_CONFIGS.map(mc => {
    const blobTypeSniffer = prg(mc.basicProgramStart);
    blobTypeSniffer.hashTags.push("vic20");
    return blobTypeSniffer
  });

  constructor(memConfig: MemoryConfiguration, roms: RomImage[] = VIC_ROMS) {
    super(Vic20.NAME, new Mos6502(), new ArrayMemory(KB_64, Mos6502.ENDIANNESS), memConfig, roms, [Vic20.NAME]);
  }
}

const UNEXPANDED_VIC_BASIC = new CbmBasicSniffer(Vic20.MEM_CONFIG.UNEX);
const EXP03K_VIC_BASIC = new CbmBasicSniffer(Vic20.MEM_CONFIG.EXP03K);
const EXP08K_VIC_BASIC = new CbmBasicSniffer(Vic20.MEM_CONFIG.EXP08K);
const EXP16K_VIC_BASIC = new CbmBasicSniffer(Vic20.MEM_CONFIG.EXP16K);
const EXP24K_VIC_BASIC = new CbmBasicSniffer(Vic20.MEM_CONFIG.EXP24K);

/**
 * VIC-20 cart image sniffer. Currently only handles single contiguous mapped-regions.
 */
const VIC20_CART_SNIFFER = new CartSniffer(
    "VIC-20 cart",
    "Cartridge ROM image dump",
    ["cart", Vic20.NAME],
    A0CBM, CART_SIG_OFFSET,
    new DisassemblyMetaImpl(
        CART_BASE_ADDRESS_OFFSET,
        CART_JUMP_POINT_OFFSETS,
        2,
        [
          new CartSigEdict(CART_SIG_OFFSET, A0CBM.length, "specified by VIC-20 cart format"),
          new WordDefinitionEdict(CART_BASE_ADDRESS_OFFSET, mkLabels("cartBase")),
          new WordDefinitionEdict(CART_COLD_VECTOR_OFFSET, mkLabels("resetVector")),
          new WordDefinitionEdict(CART_WARM_VECTOR_OFFSET, mkLabels("nmiVector")),
        ], VIC_20_CART_VECTORS,
        VIC20_SYM
    )
);

const VIC20_SNIFFERS = [
  UNEXPANDED_VIC_BASIC,
  EXP03K_VIC_BASIC,
  EXP08K_VIC_BASIC,
  EXP16K_VIC_BASIC,
  EXP24K_VIC_BASIC,
]

export {
  Vic20,
  VIC_CART_ADDRS,
  VIC20_CART_SNIFFER,
  UNEXPANDED_VIC_BASIC,
  EXP03K_VIC_BASIC,
  EXP08K_VIC_BASIC,
  EXP16K_VIC_BASIC,
  EXP24K_VIC_BASIC,
  VIC20_SYM,
  VIC20_SNIFFERS
}