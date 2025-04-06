import {InstructionSet} from "./asm/InstructionSet.ts";
import {Endian} from "./Endian.ts";

/**
 * Represents the CPU of a machine. Tentative minimal definition until more implementations
 * make it clearer what shape this should take.
 */
export interface Cpu<T extends Endian> {
  endianness: () => T;
  name: () => string;
  isa: () => InstructionSet;
}