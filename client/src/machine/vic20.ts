// VIC-20 specific details

import {Computer, LogicalLine, MemoryConfiguration, Tag, TAG_ADDRESS, TAG_LINE_NUMBER} from "./api";
import {
    BlobSniffer,
    ByteDefinitionEdict,
    DisassemblyMeta,
    DisassemblyMetaImpl,
    JumpTargetFetcher,
    LabelsComments,
    mkLabels,
    SymbolTable,
    VectorDefinitionEdict,
} from "./asm";
import {CBM_BASIC_2_0} from "./basic";
import {CartSniffer, prg} from "./cbm";
import {ArrayMemory, KB_64, LE} from "./core";
import {FileBlob} from "./FileBlob";
import {Mos6502} from "./mos6502";

const VIC20_KERNAL = new SymbolTable("vic20");

// kernal jump table, yes that's how they spell it
VIC20_KERNAL.sub(0xff8a, "restor", "set KERNAL vectors to defaults", "contains jmp $fd52");
VIC20_KERNAL.sub(0xff8d, "vector", "Change Vectors For User", "contains jmp $fd57");
VIC20_KERNAL.sub(0xff90, "setmsg", "Control OS Messages", "contains jmp $fe66");
VIC20_KERNAL.sub(0xff93, "secnd", "Send SA After Listen", "contains jmp $eec0");
VIC20_KERNAL.sub(0xff96, "tksa", "Send SA After Talk", "contains jmp $eece");
VIC20_KERNAL.sub(0xff99, "memtop", "Set/Read System RAM Top", "contains jmp $fe73");
VIC20_KERNAL.sub(0xff9c, "membot", "Set/Read System RAM Bottom", "contains jmp $fe82");
VIC20_KERNAL.sub(0xff9f, "scnkey", "Scan Keyboard", "contains jmp $eb1e");
VIC20_KERNAL.sub(0xffa2, "settmo", "Set Timeout In IEEE", "contains jmp $fe6f");
VIC20_KERNAL.sub(0xffa5, "acptr", "Handshake Serial Byte In", "contains jmp $ef19");
VIC20_KERNAL.sub(0xffa8, "ciout", "Handshake Serial Byte Out", "contains jmp $eee4");
VIC20_KERNAL.sub(0xffab, "untalk", "Command Serial Bus UNTALK", "contains jmp $eef6");
VIC20_KERNAL.sub(0xffae, "unlsn", "Command Serial Bus UNLISTEN", "contains jmp $ef04");
VIC20_KERNAL.sub(0xffb1, "listn", "Command Serial Bus LISTEN", "contains jmp $ee17");
VIC20_KERNAL.sub(0xffb4, "talk", "Command Serial Bus TALK", "contains jmp $ee14");
VIC20_KERNAL.sub(0xffb7, "readss", "Read I/O Status Word", "contains jmp $fe57");
VIC20_KERNAL.sub(0xffba, "setlfs", "Set Logical File Parameters", "contains jmp $fe50");
VIC20_KERNAL.sub(0xffbd, "setnam", "Set Filename", "contains jmp $fe49");
VIC20_KERNAL.sub(0xffc0, "iopen", "Open Vector [F40A] (indirect entry)", "contains jmp ($031a)");
VIC20_KERNAL.sub(0xffc3, "iclose", "Close Vector [F34A] (indirect entry)", "contains jmp ($031c)");
VIC20_KERNAL.sub(0xffc6, "ichkin", "Set Input [F2C7] (indirect entry)", "contains jmp ($031e)");
VIC20_KERNAL.sub(0xffc9, "ichkout", "Set Output [F309] (indirect entry)", "contains jmp ($0320)");
VIC20_KERNAL.sub(0xffcc, "iclrch", "Restore I/O Vector [F353] (indirect entry)", "contains jmp ($0322)");
VIC20_KERNAL.sub(0xffcf, "ichrin", "Input Vector, chrin [F20E] (indirect entry)", "contains jmp ($0324)");
VIC20_KERNAL.sub(0xffd2, "ichrout", "Output Vector, chrout [F27A] (indirect entry) (indirect entry)", "contains jmp ($0326)");
VIC20_KERNAL.sub(0xffd5, "load", "Load RAM From Device", "contains jmp $f542");
VIC20_KERNAL.sub(0xffd8, "save", "Save RAM To Device", "contains jmp $f675");
VIC20_KERNAL.sub(0xffdb, "settim", "Set Real-Time Clock", "contains jmp $f767");
VIC20_KERNAL.sub(0xffde, "rdtim", "Read Real-Time Clock", "contains jmp $f760");
VIC20_KERNAL.sub(0xffe1, "istop", "Test-Stop Vector [F770] (indirect entry)", "contains jmp ($0328)");
VIC20_KERNAL.sub(0xffe4, "igetin", "Get From Keyboad [F1F5] (indirect entry)", "contains jmp ($032a)");
VIC20_KERNAL.sub(0xffe7, "iclall", "Close All Channels And Files [F3EF] (indirect entry)", "contains jmp ($032c)");
VIC20_KERNAL.sub(0xffea, "udtim", "Increment Real-Time Clock", "contains jmp $f734");
VIC20_KERNAL.sub(0xffed, "screen", "Return Screen Organization", "contains jmp $e505");
VIC20_KERNAL.sub(0xfff0, "plot", "Read / Set Cursor X/Y Position", "contains jmp $e50a");
VIC20_KERNAL.sub(0xfff3, "iobase", "Return I/O Base Address", "contains jmp $e500");

VIC20_KERNAL.sub(0xfd52, "restor_vector", "restore kernal vectors (direct vector)");
VIC20_KERNAL.sub(0xfdf9, "ioinit_vector", "i/o initialisation (direct vector");
VIC20_KERNAL.sub(0xe518, "screeninit_vector", "screen initialisation (direct vector)");

VIC20_KERNAL.sub(0xfd8d, "ram_init", "initialise and test RAM");
VIC20_KERNAL.sub(0xe45b, "basic_vector_init", "initialise basic vector table");
VIC20_KERNAL.sub(0xe3a4, "basic_ram_init", "initialise basic ram locations");

VIC20_KERNAL.reg(0x0316, "break_interrupt_vector", "break interrupt vector", "(fed2)");
VIC20_KERNAL.reg(0x0317, "break_interrupt_vector_msb", "break interrupt vector (MSB)");
VIC20_KERNAL.reg(0x0318, "nmi_vector", "non-maskable interrupt jump location");
VIC20_KERNAL.reg(0x0319, "nmi_vector_msb", "non-maskable interrupt jump location (MSB)");
VIC20_KERNAL.reg(0x0286, "color_mode", "characters are multi-color or single color");


// vic-20 cartridge image definition:

/**
 * VIC-20 cartridge magic signature A0CBM in petscii where
 * CBM is in reverse video (&70).
 */
const A0CBM = [0x41, 0x30, 0xc3, 0xc2, 0xcd];
const MAGIC_OFFSET = 6;

/** The loading address vector is in the image at this offset. */
const VIC20_CART_BASE_ADDRESS_OFFSET = 0;
/** The cold reset vector is stored at this offset. */
const VIC20_CART_COLD_VECTOR_OFFSET = 2;
/** The warm reset vector (NMI) is stored at this offset. */
const VIC20_CART_WARM_VECTOR_OFFSET = 4;

const jumpTargetFetcher: JumpTargetFetcher = (fb: FileBlob) => [
    [fb.readVector(VIC20_CART_COLD_VECTOR_OFFSET), new LabelsComments("reset", "main entry point")],
    [fb.readVector(VIC20_CART_WARM_VECTOR_OFFSET), new LabelsComments("nmi", "jump target on restore key")]
];

/**
 * VIC-20 cart image sniffer. Currently only handles single contiguous mapped-regions.
 */
const VIC20_CART = new CartSniffer(
    "VIC-20 cart image",
    "ROM dump from VIC-20",
    ["cart", "vic20"],
    A0CBM, MAGIC_OFFSET,
    new DisassemblyMetaImpl(
        VIC20_CART_BASE_ADDRESS_OFFSET,
        VIC20_CART_COLD_VECTOR_OFFSET,
        2,
        [
            new ByteDefinitionEdict(MAGIC_OFFSET, A0CBM.length, new LabelsComments("cartSig", "specified by VIC-20 cart format")),
            new VectorDefinitionEdict(VIC20_CART_BASE_ADDRESS_OFFSET, mkLabels("cartBase")),
            new VectorDefinitionEdict(VIC20_CART_COLD_VECTOR_OFFSET, mkLabels("resetVector")),
            new VectorDefinitionEdict(VIC20_CART_WARM_VECTOR_OFFSET, mkLabels("nmiVector")),
        ], jumpTargetFetcher,
        VIC20_KERNAL
    )
);

/** Common load addresses for machine language programs. */
const COMMON_MLPS = [
    prg([0x00, 0x40]),  // 0x4000
    prg([0x00, 0x60]),  // 0x6000
    prg([0x00, 0x80]),  // 0x8000
    prg([0x00, 0xa0]),  // 0xa000
    prg([0x00, 0xc0]),  // 0xc000
];

const VIC20_UNEX = new MemoryConfiguration("VIC-20 unexpanded", 0x1001, "unexpanded");
const VIC20_EXP03K = new MemoryConfiguration("VIC-20 3k expansion", 0x401, "3k");
const VIC20_EXP08K = new MemoryConfiguration("VIC-20 8k expansion", 0x1201, "8k");
const VIC20_EXP16K = new MemoryConfiguration("VIC-20 16k expansion", 0x1201, "16k");
const VIC20_EXP24K = new MemoryConfiguration("VIC-20 24k expansion", 0x1201, "24k");

/**
 * Vic-20 BASIC
 */
export class Vic20Basic implements BlobSniffer {

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
        const byte0 = fb.getBytes()[0] === (this.memory.basicStart & 0xff);
        const byte1 = fb.getBytes()[1] === ((this.memory.basicStart & 0xff00) >> 8);
        let isBasic = (byte0 && byte1) ? 1.2 : 0.8;

        // try decoding it as basic
        try {
            const decoded = CBM_BASIC_2_0.decode(fb);
            let lastNum = -1;
            let lastAddr = -1;
            decoded.getLines().forEach((ll: LogicalLine) => {
                const i: Tag[] = ll.getTags();
                const lnumStr = i.find(t => t.hasTag(TAG_LINE_NUMBER));
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
                        // eslint-disable-next-line no-template-curly-in-string
                        console.log(`lower next line address for ${fb.name}`)
                        isBasic *= 0.3;
                    }
                    lastNum = thisNum;
                } else {
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

const UNEXPANDED_VIC_BASIC = new Vic20Basic(VIC20_UNEX);
const EXP03K_VIC_BASIC = new Vic20Basic(VIC20_EXP03K);
const EXP08K_VIC_BASIC = new Vic20Basic(VIC20_EXP08K);
const EXP16K_VIC_BASIC = new Vic20Basic(VIC20_EXP16K);
const EXP24K_VIC_BASIC = new Vic20Basic(VIC20_EXP24K);

class Vic20 extends Computer {
    constructor(memory: MemoryConfiguration) {
        super("vic-20", new Mos6502(), new ArrayMemory(KB_64, LE), memory, ["vic20"]);
    }
}

export {
    Vic20,
    COMMON_MLPS,
    VIC20_CART,
    UNEXPANDED_VIC_BASIC,
    EXP03K_VIC_BASIC,
    EXP08K_VIC_BASIC,
    EXP16K_VIC_BASIC,
    EXP24K_VIC_BASIC,
    VIC20_KERNAL,
    VIC20_UNEX,
    VIC20_EXP03K,
    VIC20_EXP08K,
    VIC20_EXP16K,
    VIC20_EXP24K,
}