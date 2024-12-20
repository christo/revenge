import {assertByte} from "./core.ts";
import {AddressingMode, Cycles, Instruction, InstructionCall} from "./mos6502.ts";
import {Op} from "./Op.ts";

/**
 * Represents the whole set of machine instructions.
 */
class InstructionSet {
  // note redundancy here, like all bad code, huddles behind the defense of performance,
  // prematurely optimised as per root of all evil
  private mnemonicToByte = new Map<string, number>([]);
  private ops: Array<Op> = [];
  private modes: Array<AddressingMode> = [];
  /** The number of bytes in the instruction with the given opcode */
  private bytes: Array<number> = [];
  // noinspection JSMismatchedCollectionQueryUpdate
  private cycles: Array<Cycles> = [];
  private instructions: Array<Instruction> = [];

  add(opcode: number, op: Op, mode: AddressingMode, bytes: number, cycles: Cycles) {
    const o = assertByte(opcode);
    if (this.instructions[o]) {
      throw Error("Instruction for this opcode already registered.");
    }
    if (bytes !== 0 && bytes !== 1 && bytes !== 2 && bytes !== 3) {
      throw Error("number of bytes in an instruction should be only: 0,1,2 or 3");
    }
    this.mnemonicToByte.set(op.mnemonic, o);
    this.ops[o] = op;
    this.modes[o] = mode;
    this.bytes[o] = bytes;
    this.cycles[o] = cycles;
    this.instructions[o] = new Instruction(op, mode, o, bytes, cycles, false);
  }

  op(opcode: number) {
    return this.ops[assertByte(opcode)];
  }

  // noinspection JSUnusedGlobalSymbols
  mode(opcode: number) {
    return this.modes[assertByte(opcode)];
  }

  numBytes(opcode: number) {
    return this.bytes[assertByte(opcode)];
  }

  /**
   * Gets the instruction with the given opcode.
   */
  instruction(opcode: number): Instruction {
    return this.instructions[assertByte(opcode)];
  }

  /**
   * Case insensitive, finds one instruction with given mnemonic.
   * @param mnemonic
   */
  byName(mnemonic: string): Instruction | undefined {
    const m = mnemonic.toUpperCase();
    return this.instructions.find(i => i && i.op.mnemonic.toUpperCase() === m);
  }

  byNameAndMode(mnemonic: string, mode: AddressingMode): Instruction | undefined {
    const m = mnemonic.toUpperCase();
    return this.instructions.find(i => {
      return i && i.op.mnemonic.toUpperCase() === m && i.mode === mode;
    });
  }

  all() {
    // TODO finish implementing this weird thing
    const builder: Builder = {
      bytes: [] as number[],
      add: {} as InstructionCall,
      opMap: {},
      build: () => [234]
    };
    this.ops.forEach(op => {
      builder.opMap[op.mnemonic] = (_args: number[]) => {
        const instructionBytes = this.byName(op.mnemonic)?.getBytes();
        instructionBytes?.forEach(b => builder.bytes.push(b));
        return builder;
      };
    })
  }

}


/**
 * Fluent builder for constructing binary programs
 */
type Builder = {
  bytes: number[],
  add: InstructionCall,
  // TODO looks way skuffed here
  opMap: { [keyof: string]: (args: number[]) => Builder }
  build: () => number[];
}

export {InstructionSet};