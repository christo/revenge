import {expect} from 'chai';
import {Mos6502} from '../../src/machine/mos6502'

describe("Mos6502 implied mode opcodes", () => {
  it("returns NOP name", () => {
    expect(Mos6502.ISA.byName("NOP")!.getBytes()).to.eql([0xea]);
  });
  it("returns PHA name", () => {
    expect(Mos6502.ISA.byName("PHA")!.getBytes()).to.eql([0x48]);
  });
  it("returns INX name", () => {
    expect(Mos6502.ISA.byName("INX")!.getBytes()).to.eql([0xe8]);
  });
});