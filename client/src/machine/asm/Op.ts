/**
 * Encapsulates important meaning of an instruction so that code can be simply analysed or approximately
 * interpreted.
 */
export enum OpSemantics {
  IS_UNCONDITIONAL_JUMP,  // will modify PC
  IS_CONDITIONAL_JUMP,    // may modify PC
  IS_RETURNABLE_JUMP,    // may modify PC
  IS_BREAK,   // intentional stop of further processing
  IS_JAM,     // undocumented stop of further processing
  IS_ILLEGAL, // undocumented but may execute
  IS_STORE,   // modifies memory
  IS_RETURN,  // return from subroutine or interrupt
  IS_MEMORY_WRITE,   // modifies memory
  IS_MEMORY_READ, // reads a value from a memory location

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