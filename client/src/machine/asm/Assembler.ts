import {Addr, TODO} from "../core.ts";
import {InstructionSet} from "../mos6502.ts";
import {Dialect} from "./Dialect.ts";
import {InstructionLike} from "./instructions.ts";
import {ParserState} from "./DefaultDialect.ts";

/**
 * Syntax-independent stateful assembler, parametised by {@link InstructionSet}
 * and {@link Dialect}.
 */
class Assembler {
  private currentAddress: Addr;
  setCurrentAddress(addres: Addr) {
      this.currentAddress = addres;
  }

  private readonly isa: InstructionSet;
  private readonly dialect: Dialect;

  constructor(isa: InstructionSet, dialect: Dialect) {
    this.isa = isa;
    this.dialect = dialect;
    this.currentAddress = 0;
  }

  /**
   * Emit bytes for the given instruction from the configured instruction set
   */
  emit(instruction: InstructionLike): number[]  {
    return instruction.getBytes();
  }

  parse(line: string): [InstructionLike, ParserState] {
    return this.dialect.parseLine(line, ParserState.READY);
  }
}

export {Assembler};