import {Cpu} from "../Cpu.js";
import {Endian} from "../Endian.js";
import {InstructionSet} from "./InstructionSet.js";
import {SymbolTable} from "./SymbolTable.js";

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