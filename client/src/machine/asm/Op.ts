import {AddressingMode} from "../../../../server/src/common/machine/AddressingMode.ts";
import {MODE_ABSOLUTE, MODE_ZEROPAGE} from "../mos6502.ts";

/**
 * Encapsulates important meaning of an instruction so that code can be simply analysed or approximately
 * interpreted.
 */
export enum OpSemantics {
  /** Will modify PC */
  IS_UNCONDITIONAL_JUMP,
  /** May modify PC */
  IS_CONDITIONAL_JUMP,
  /** May modify PC, could continue execution at next instruction after doing so */
  IS_RETURNABLE_JUMP,
  /** Intentional stop of further processing, might be trapped by runtime vector */
  IS_BREAK,
  /** CPU hangs cannot continue further processing */
  IS_JAM,
  /** Undocumented but may execute with known effects (possibly CPU variant dependent) */
  IS_ILLEGAL,
  /** Return from subroutine or interrupt */
  IS_RETURN,
  /** Modifies memory */
  IS_MEMORY_WRITE,
  /** Reads a value from a memory location */
  IS_MEMORY_READ,
}

/**
 * Represents a machine instruction with a string mnemonic.
 */
export class Op {

  mnemonic: string;
  description: string;
  /** instruction category */
  cat: string;
  private semantics: OpSemantics[] = [];

  constructor(mnemonic: string, description: string, cat: string, semantics: OpSemantics[] = []) {
    this.semantics = semantics;
    this.mnemonic = mnemonic;
    this.description = description;
    this.cat = cat;
  }

  valueImpliedMode(value: number): AddressingMode | undefined {
    // TODO when implementing Z80, extract this 6502 semantics into the CPU definition
    return (value < 256) ? MODE_ZEROPAGE : MODE_ABSOLUTE;
  }

  /**
   * Returns true only if this {@see Op} has the given semantics.
   * @param semantics
   */
  has(semantics: OpSemantics): boolean {
    return this.semantics.includes(semantics);
  }

  /**
   * Returns true only if this {@see Op} has all the given semantics.
   * @param semantics
   */
  all(semantics: OpSemantics[]): boolean {
    return semantics.every(s => this.semantics.includes(s));
  }

  /**
   * Returns true only if this {@see Op} has at least one of the given semantics.
   * @param semantics
   */
  any(semantics: OpSemantics[]): boolean {
    return semantics.some(s => this.semantics.includes(s));
  }

}