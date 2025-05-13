/**
 * Represents how operands are interpreted.
 */
class AddressingMode {
  readonly code: string;
  readonly desc: string;
  readonly template: string;
  readonly blurb: string
  readonly numOperandBytes: number;

  /**
   * Make an addressing mode using all the goodies.
   *
   * @param code the short code used to signify this addressing mode. Must contain no spaces.
   * @param desc human readable description.
   * @param template a semiformal documentation format.
   * @param blurb additional clarifying description.
   * @param numOperandBytes number of bytes in the expected operand.
   */
  constructor(code: string, desc: string, template: string, blurb: string, numOperandBytes: number) {
    if (!code.match(/^[A-Za-z_]+$/)) {
      throw Error("Addressing mode code must contain only these chars: A-Za-z_");
    }
    if (numOperandBytes < 0 || Math.round(numOperandBytes) !== numOperandBytes) {
      throw Error(`Number of operand bytes must be a positive integer, ${numOperandBytes} is unnatural!`);
    }
    this.code = code;
    this.desc = desc;
    this.template = template;
    this.blurb = blurb;
    this.numOperandBytes = numOperandBytes;
  }
}

export {AddressingMode};