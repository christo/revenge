import {expect} from "chai";
import * as fs from "fs";
import * as path from "node:path";
import {C64_8K16K_CART_SNIFFER, C64_CRT} from "../../../src/common/machine/cbm/c64.js";
import {C64StubSniffer} from "../../../src/common/machine/cbm/C64StubSniffer";
import {FileBlob} from "../../../src/common/machine/FileBlob";
import {Mos6502} from "../../../src/common/machine/mos6502";
import {PRELOADS_DIR_C64} from "../../../src/constants.js";

describe("c64", () => {

  it("sniff machine code with basic stub", () => {
    const filename = 'Gridrunner.prg';
    const filepath = path.join("..", "server", PRELOADS_DIR_C64, filename);
    const buffer = fs.readFileSync(filepath);
    const fb = FileBlob.fromBytes(filename, Array.from(buffer), Mos6502.ENDIANNESS);
    expect(buffer.length).to.equal(3143);
    const c64StubSniffer = new C64StubSniffer();
    const stench = c64StubSniffer.sniff(fb);
    expect(stench.score).gte(100);
  });

  it("sniffs 8k cart dump and reads its base address from the file", () => {
    const CART_BASE = 0x8000;
    const CART_SIZE = 8 * 1024;
    const NOP = 0xea;
    const loadAddress = [0x00, 0x80];
    const coldVector = [0x09, 0x80];
    const warmVector = [0x09, 0x80];
    const cbm80 = [0xc3, 0xc2, 0xcd, 0x38, 0x30];
    const header = [...loadAddress, ...coldVector, ...warmVector, ...cbm80];
    const bytes = [...header, ...new Array(CART_SIZE - (header.length - loadAddress.length)).fill(NOP)];
    const fb = FileBlob.fromBytes("cart.bin", bytes, Mos6502.ENDIANNESS);
    expect(C64_8K16K_CART_SNIFFER.sniff(fb).score).gt(1);
    expect(C64_8K16K_CART_SNIFFER.getMeta().baseAddress(fb)).to.equal(CART_BASE);
  });

  it("sniffs CRT file by its ASCII header", () => {
    const header = Array.from(Buffer.from("C64 CARTRIDGE   ", "ascii"));
    const fb = FileBlob.fromBytes("game.crt", [...header, 0, 0, 0, 0x40], Mos6502.ENDIANNESS);
    expect(C64_CRT.sniff(fb).score).gt(1);
  });
});
