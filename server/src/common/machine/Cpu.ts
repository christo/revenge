import {InstructionSet} from "../../../../client/src/machine/asm/InstructionSet.js";
import {Endian} from "./Endian.js";

/**
 * Represents the CPU of a machine. Tentative minimal definition until more implementations
 * make it clearer what shape this should take.
 */
export interface Cpu<T extends Endian> {
  endianness: () => T;
  name: () => string;
  isa: () => InstructionSet;
}