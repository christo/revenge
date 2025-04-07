import {Addr} from "../core.ts";
import {Endian} from "../Endian.ts";
import {AssemblyMeta} from "./AssemblyMeta.ts";
import {Dialect} from "./Dialect.ts";
import {InstructionLike} from "./instructions.ts";
import {InstructionSet} from "./InstructionSet.ts";
import {OperandResolver} from "./OperandResolver.ts";
import {ParserState} from "./ParserState.ts";
import {SymbolTable} from "./SymbolTable.ts";

/**
 * Syntax-independent stateful assembler, parametised by {@link InstructionSet}
 * and {@link Dialect}.
 */
class Assembler<T extends Endian> {
  private currentAddress: Addr;
  private readonly isa: InstructionSet;
  private readonly dialect: Dialect;
  private readonly assemblyMeta: AssemblyMeta<T>;

  constructor(isa: InstructionSet, dialect: Dialect, assemblyMeta: AssemblyMeta<T>) {
    this.isa = isa;
    this.dialect = dialect;
    this.assemblyMeta = assemblyMeta;
    this.currentAddress = 0;
  }

  setCurrentAddress(addres: Addr) {
    this.currentAddress = addres;
  }

  /**
   * Emit bytes for the given instruction from the configured instruction set
   */
  emit(instruction: InstructionLike): number[] {
    return instruction.getBytes();
  }

  parse(line: string): Emitter<T>[] {
    const ps: ParserState = {
      state: "READY", symbolTable: new SymbolTable("base"),
    }
    return this.dialect.parseLine(line, ps, this.assemblyMeta);
  }
}


type Emission = {
  // TODO currently we are emitting bytes, but we should emit intermediate representation
  bytes: number[];
  error?: string;
}

function emitError(s: string): Emission {
  return {bytes: [], error: s};
}

type Emitter<T extends Endian> = (am: AssemblyMeta<T>) => Emission;

/**
 * Makes an emitter only of an error of the given message.
 * @param mesg
 */
const errorEmitter: <T extends Endian>(mesg: string) => Emitter<T> = (mesg: string) => <T extends Endian>(_am: AssemblyMeta<T>) => emitError(mesg);

const emitThis: <T extends Endian>(e: Emission) => Emitter<T> = (e: Emission) => <T extends Endian>(_am: AssemblyMeta<T>) => e;

/**
 * Wires up deferred instruction emission returning an Emitter which may depend on
 * a fully populated symbol table.
 *
 * @param mnemonic
 * @param resolver
 */
function instructionEmitter<T extends Endian>(mnemonic: string, resolver: OperandResolver): Emitter<T> {
  console.log('wiring up instruction emitter');
  return (am: AssemblyMeta<T>) => {
    console.log(`looking up mnemonic: ${mnemonic} in ${am.instructionSet.name}`);
    const op = am.instructionSet.opByName(mnemonic);
    if (op) {
      // TODO we can decide if the instruction is niladic here
      const value = resolver.value();
      if (value) {
        const mode = op.valueImpliedMode(value);
        if (mode) {
          const instruction = am.instructionSet.byNameAndMode(mnemonic, mode);
          if (instruction) {
            const twBytes = am.endian.wordToTwoBytes(value);
            return {bytes: [...instruction.getBytes(), twBytes[0], twBytes[1]]} as Emission;
          } else {
            return emitError(`Instruction set has no defined entry for ${mnemonic} mode ${mode}`);
          }
        } else {
          return emitError(`Cannot determine mode for operand ${value} `)
        }
      } else {
        return emitError(`cannot resolve operand value for ${resolver}`);
      }
    } else {
      return emitError(`Unknown mnemonic ${mnemonic}`);
    }
  }
}

export type {Emission, Emitter};
export {Assembler, emitError, emitThis, errorEmitter, instructionEmitter};