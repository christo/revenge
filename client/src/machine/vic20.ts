// VIC-20 specific details

import {CartSniffer, MemoryConfiguration, prg} from "./cbm";
import {
    BlobSniffer,
    ByteDefinitionPrecept,
    DisassemblyMeta,
    DisassemblyMetaImpl,
    JumpTargetFetcher, LabelsComments,
    mkLabels, VectorDefinitionPrecept,
} from "./asm";
import {FileBlob} from "./FileBlob";
import {CBM_BASIC_2_0} from "./basic";
import {TagSeq} from "./api";

/**
 * VIC-20 cartridge magic signature A0CBM in petscii where
 * CBM is in reverse video (&70).
 */
const A0CBM = [0x41, 0x30, 0xc3, 0xc2, 0xcd];
const MAGIC_OFFSET = 6;

/** The loading address vector is in the image at this offset. */
const VIC20_BASE_ADDRESS_OFFSET = 0;
/** The cold reset vector is stored at this offset. */
const VIC20_COLD_VECTOR_OFFSET = 2;
/** The warm reset vector (NMI) is stored at this offset. */
const VIC20_WARM_VECTOR_OFFSET = 4;

const jumpTargetFetcher:JumpTargetFetcher = (fb:FileBlob) => [
    [fb.readVector(VIC20_COLD_VECTOR_OFFSET), mkLabels("reset")],
    [fb.readVector(VIC20_WARM_VECTOR_OFFSET), mkLabels("nmi")]
];

/** VIC-20 cart image sniffer. */
const VIC20_CART = new CartSniffer(
    "VIC-20 cart image",
    "ROM dump from VIC-20",
    ["cart", "vic20"],
    A0CBM, MAGIC_OFFSET,
    new DisassemblyMetaImpl(
        VIC20_BASE_ADDRESS_OFFSET,
        VIC20_COLD_VECTOR_OFFSET,
        2,
        [
            new ByteDefinitionPrecept(MAGIC_OFFSET, A0CBM.length, new LabelsComments("cartSig", "specified by VIC-20 cart format")),
            new VectorDefinitionPrecept(VIC20_BASE_ADDRESS_OFFSET, mkLabels("cartBase")),
            new VectorDefinitionPrecept(VIC20_COLD_VECTOR_OFFSET, mkLabels("resetVector")),
            new VectorDefinitionPrecept(VIC20_WARM_VECTOR_OFFSET, mkLabels("nmiVector")),
        ], jumpTargetFetcher
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
class Vic20Basic implements BlobSniffer {

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
        const byte0 = fb.bytes.at(0) === (this.memory.basicStart & 0xff);
        const byte1 = fb.bytes.at(1) === ((this.memory.basicStart & 0xff00) >> 8);

        let isBasic = (byte0 && byte1) ? 1.2 : 0.8;

        // try decoding it as basic
        const decoded = CBM_BASIC_2_0.decode(fb);
        let lastNum = -1;
        let lastAddr = -1;
        decoded.forEach((i:TagSeq) => {
            const lnumStr = i.find(t => t.hasTag("lnum"));
            let addrStr = i.find(t => t.hasTag("addr"));
            if (lnumStr !== undefined && addrStr !== undefined) {
                let thisNum = parseInt(lnumStr.value);
                if (lastNum !== -1 && lastNum >= thisNum) {
                    // decrease in basic line numbers
                    isBasic *= 0.5;
                }

                if (lastAddr !== -1 && lastAddr >= parseInt(addrStr.value,16)) {
                    // next line address is allegedly lower? This ain't basic
                    isBasic *= 0.3;
                }
                lastNum = thisNum;
            } else {
                throw Error("line number or line addr missing!");
            }

        })
        return isBasic;
    }
}

const UNEXPANDED_VIC_BASIC = new Vic20Basic(VIC20_UNEX);
const EXP03K_VIC_BASIC = new Vic20Basic(VIC20_EXP03K);
const EXP08K_VIC_BASIC = new Vic20Basic(VIC20_EXP08K);
const EXP16K_VIC_BASIC = new Vic20Basic(VIC20_EXP16K);
const EXP24K_VIC_BASIC = new Vic20Basic(VIC20_EXP24K);

export {
    COMMON_MLPS,
    VIC20_CART,
    UNEXPANDED_VIC_BASIC,
    EXP03K_VIC_BASIC,
    EXP08K_VIC_BASIC,
    EXP16K_VIC_BASIC,
    EXP24K_VIC_BASIC
}