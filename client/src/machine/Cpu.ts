import {InstructionSet} from "./asm/InstructionSet.ts";
import {Endian} from "./Endian.ts";

/**
 * Represents the CPU of a machine. Tentative minimal definition until more implementations
 * make it clearer what shape this should take.
 */
export interface Cpu {
  endianness: () => Endian;
  name: () => string;
  isa: () => InstructionSet;
}