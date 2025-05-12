/**
 * This file provides browser-compatible reexports of server code
 * that the client needs to use. It handles the dependencies in a way
 * that works in the browser environment.
 */

// Core types
export { Detail } from '@common/Detail.js';
export { FileLike } from '@common/FileLike.js';
export type { QuickLoad } from '@common/QuickLoad.js';
export type { ServerError } from '@common/ServerError.js';
export { DataViewImpl } from '@common/DataView.js';

// Analysis
export { Bigram } from '@common/analysis/Bigram.js';
export { HashCalc } from '@common/analysis/HashCalc.js';

// Machine
export { FileBlob } from '@common/machine/FileBlob.js';
export { Tag, TAG_OPERAND_VALUE, TAG_HEXBYTES, HexTag } from '@common/machine/Tag.js';
export { bestSniffer, UNKNOWN_BLOB } from '@common/machine/BlobSniffer.js';
export type { BlobSniffer } from '@common/machine/BlobSniffer.js';
export { hex8, hex16 } from '@common/machine/core.js';
export { LittleEndian } from '@common/machine/Endian.js';
export { LogicalLine } from '@common/machine/LogicalLine.js';
export type { Memory } from '@common/machine/Memory.js';
export { Mos6502 } from '@common/machine/mos6502.js';

// Assembly
export { Environment } from '@common/machine/asm/asm.js';
export { RevengeDialect } from '@common/machine/asm/RevengeDialect.js';
export { Disassembler } from '@common/machine/asm/Disassembler.js';

// CBM
export { CBM_BASIC_2_0 } from '@common/machine/cbm/BasicDecoder.js';
export { C64_8K16K_CART_SNIFFER, C64_CRT } from '@common/machine/cbm/c64.js';
export { VIC20_SNIFFERS, VIC20_CART_SNIFFER, Vic20, VIC_CART_IMAGE_SNIFFERS } from '@common/machine/cbm/vic20.js';
export { BASIC_SNIFFERS, ALL_CBM_FILE_EXTS } from '@common/machine/cbm/cbm.js';
export { disassembleActual } from '@common/machine/dynamicAnalysis.ts';
export { CbmBasicSniffer } from '@common/machine/cbm/CbmBasicSniffer';
export { Vic20StubSniffer } from '@common/machine/cbm/Vic20StubSniffer.js';