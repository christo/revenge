import {LE} from "../../src/machine/Endian";
import {Mos6502} from "../../src/machine/mos6502";
import {ArrayMemory} from "../../src/machine/Memory";

/**
 * Return the bytes of each opcode in sequence - if there are several, chooses one in an unspecified way,
 * so presumably only useful for niladic instructions with implied addressing mode.
 * @param niladics no operands are included, so only suits niladic ops
 */
export function niladicOpcodes(niladics: string[]): number[] {
  return niladics.flatMap(op => Mos6502.ISA.byName(op).getBytes())
}

export function mem(contents: number[], offset: number = 0) {
  const arrayMemory = new ArrayMemory(contents, LE, true, true);
  if (offset > 0) {
    throw Error("not implemented");
  }
  return arrayMemory;
}