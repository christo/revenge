import {expect} from 'chai';
import {Mos6502} from '../../src/machine/mos6502'

describe("Mos6502", () => {
  it("returns instruction by opcode name", ()=>{
    expect(Mos6502.ISA.byName("NOP").getBytes()).to.eql([0xea]);
  });
});