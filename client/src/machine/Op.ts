export enum OpSemantics {
  IS_UNCONDITIONAL_JUMP,  // will modify PC
  IS_CONDITIONAL_JUMP,    // may modify PC
  IS_BREAK,   // legit break
  IS_JAM,     // illegal break
  IS_ILLEGAL, // undocumented but may execute
  IS_STORE,   // modifies memory
  IS_RETURN,  // return from subroutine or interrupt
}

export class Op {
  mnemonic: string;
  description: string;
  /** mnemonic category */
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