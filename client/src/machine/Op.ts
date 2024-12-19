export class Op {
  mnemonic: string;
  description: string;
  /** mnemonic category */
  cat: string;
  private readonly _isJump: boolean;

  constructor(mnemonic: string, description: string, cat: string, isJump = false) {
    this.mnemonic = mnemonic;
    this.description = description;
    this.cat = cat;
    this._isJump = isJump;
  }

  get isJump(): boolean {
    return this._isJump;
  }
}