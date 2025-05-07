import {LabelsComments, mkComments} from "../asm/asm.js";
import {DisassemblyMeta} from "../asm/DisassemblyMeta.js";
import {IndexedDescriptor} from "../asm/DisassemblyMetaImpl.js";
import {Edict} from "../asm/Edict.js";
import {InstructionLike, WordDefinitionEdict} from "../asm/instructions.js";
import {SymbolTable} from "../asm/SymbolTable.js";
import {Addr} from "../core.js";
import {FileBlob} from "../FileBlob.js";
import {MemoryConfiguration} from "../MemoryConfiguration.js";

const PRG_CONTENT_OFFSET = 2;


export class BasicStubDisassemblyMeta implements DisassemblyMeta {
  private memoryConfig: MemoryConfiguration;
  private readonly symbolTable: SymbolTable;
  private readonly entryPointAddress: number;
  private readonly entryPointDesc: string;
  private readonly symbols: [number, LabelsComments][];

  constructor(memoryConfig: MemoryConfiguration, symbolTable: SymbolTable, entryPointAddress: Addr, entryPointDesc: string) {
    this.symbolTable = symbolTable;
    this.memoryConfig = memoryConfig;
    this.entryPointAddress = entryPointAddress;
    this.entryPointDesc = entryPointDesc;
    const lc = new LabelsComments("entry", `called from ${entryPointDesc}`);
    this.symbols = [[this.entryPointAddress, lc]];
  }

  baseAddress(fb: FileBlob): number {
    return fb.read16(0);
  }

  contentStartOffset(): number {
    return PRG_CONTENT_OFFSET;
  }

  executionEntryPoints(_fb: FileBlob): IndexedDescriptor[] {
    return [{index: this.entryPointAddress, name: this.entryPointDesc, description: ""}];
  }

  getEdict(offset: number): Edict<InstructionLike> | undefined {
    if (offset === 2) {
      // TODO add label to symbol table for the next line and make this word reference that symbol
      //   undecided on detailed mechanics of making this work
      return new WordDefinitionEdict(2, mkComments('Next line pointer'), false);
    }
    if (offset === 4) {
      return new WordDefinitionEdict(4, mkComments('BASIC line number'), true);
    }
    return undefined;
  }

  getSymbolTable(): SymbolTable {
    return this.symbolTable;
  }

  isInBinary(addr: number, fb: FileBlob): boolean {
    return addr > this.memoryConfig.basicProgramStart && addr < (fb.getLength() - PRG_CONTENT_OFFSET);
  }

  resolveSymbols(_fb: FileBlob): [number, LabelsComments][] {
    return this.symbols;
  }
}