import {Cpu} from "../Cpu.ts";
import {Endian} from "../Endian.ts";
import {InstructionSet} from "./InstructionSet.ts";
import {SymbolTable} from "./SymbolTable.ts";

export class AssemblyMeta<T extends Endian> {
  readonly symbolTable: SymbolTable;
  readonly instructionSet: InstructionSet;
  readonly endian: T;

  constructor(symbolTable: SymbolTable, cpu: Cpu<T>) {
    this.symbolTable = symbolTable;
    this.instructionSet = cpu.isa();
    this.endian = cpu.endianness();
  }
}