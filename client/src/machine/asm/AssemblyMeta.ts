import {Cpu} from "../Cpu.ts";
import {Endian} from "../Endian.ts";
import {InstructionSet} from "./InstructionSet.ts";
import {SymbolTable} from "./SymbolTable.ts";

/**
 * Metadata for the assembler.
 */
export class AssemblyMeta {
  readonly symbolTable: SymbolTable;
  readonly instructionSet: InstructionSet;
  readonly endian: Endian;

  constructor(symbolTable: SymbolTable, cpu: Cpu<Endian>) {
    this.symbolTable = symbolTable;
    this.instructionSet = cpu.isa();
    this.endian = cpu.endianness();
  }
}