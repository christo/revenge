import {OperandResolver} from "./OperandResolver.ts";

class LiteralOperand implements OperandResolver {
  deferred: boolean = false;
  private readonly literal: number;

  constructor(value: number) {
    this.literal = value;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  value(): number | undefined {
    console.log(`returning value ${this.literal}`);
    return this.literal;
  }

  toString() {
    return this.literal.toString();
  }

}

export {LiteralOperand};