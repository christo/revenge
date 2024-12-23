import {Mos6502} from "../../src/machine/mos6502";
import {LE} from "../../src/machine/core";
import {FileBlob} from "../../src/machine/FileBlob";
import {DisassemblyMetaImpl} from "../../src/machine/asm/DisassemblyMetaImpl";
import {Disassembler} from "../../src/machine/asm/Disassembler";
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

/**
 * Convenience for creating a little endian disassembler with base address at 0 and content at 2
 * @param bytes program including load address in little endian at address 0, 1
 * @deprecated
 */
export function createDisassembler(bytes: number[]) {
  const fb = FileBlob.fromBytes("testblob", bytes, LE);
  const dm = new DisassemblyMetaImpl(0, 0, 2);
  return new Disassembler(Mos6502.ISA, fb, dm);
}