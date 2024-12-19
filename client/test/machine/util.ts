import {Mos6502} from "../../src/machine/mos6502";
import {ArrayMemory, LE} from "../../src/machine/core";
import {FileBlob} from "../../src/machine/FileBlob";
import {DisassemblyMetaImpl} from "../../src/machine/asm/DisassemblyMetaImpl";
import {Disassembler} from "../../src/machine/asm/Disassembler";

/**
 * Return the bytes of each opcode in sequence - if there are several, chooses one "randomly"
 * @param niladics no operands are included, so only suits niladic ops
 */
export function niladicOpcodes(niladics: string[]): number[] {
  return niladics.flatMap(op => Mos6502.ISA.byName(op).getBytes())
}

export function mem(contents: number[]) {
  return new ArrayMemory(contents, LE, true, true);
}

export function createDisassembler(machineCode: number[], contentStartOffset: number) {
  const fb = FileBlob.fromBytes("testblob", machineCode, LE);
  const dm = new DisassemblyMetaImpl(0, 0, contentStartOffset);
  return new Disassembler(Mos6502.ISA, fb, dm);
}