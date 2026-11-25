import {expect} from 'chai';
import {Mos6502} from '../../../src/common/machine/mos6502.ts'

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

describe("Mos6502 mnemonics", () => {
  it("names ADC opcodes ADC", () => {
    const ADC_IMMEDIATE = 0x69;
    expect(Mos6502.ISA.op(ADC_IMMEDIATE)!.mnemonic).to.equal("ADC");
    expect(Mos6502.ISA.byName("ADC")?.op.mnemonic).to.equal("ADC");
  });
});
