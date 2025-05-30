import {InstructionSet} from "./asm/InstructionSet.js";
import {Endian} from "./Endian.js";

/**
 * Represents the CPU of a machine. Tentative minimal definition until more implementations
 * make it clearer what shape this should take.
 */
export interface Cpu<T extends Endian> {
  endianness: () => T;
  getName(): string;
  isa: () => InstructionSet;
}