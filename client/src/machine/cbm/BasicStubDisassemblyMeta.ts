import {MemoryConfiguration} from "../api.ts";
import {LabelsComments, SymbolTable} from "../asm/asm.ts";
import {DisassemblyMeta} from "../asm/DisassemblyMeta.ts";
import {IndexedDescriptor} from "../asm/DisassemblyMetaImpl.ts";
import {Edict} from "../asm/Edict.ts";
import {InstructionLike} from "../asm/instructions.ts";
import {Addr} from "../core.ts";
import {FileBlob} from "../FileBlob.ts";

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  executionEntryPoints(_fb: FileBlob): IndexedDescriptor[] {
    return [{index: this.entryPointAddress, name: this.entryPointDesc, description: ""}];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getEdict(_offset: number): Edict<InstructionLike> | undefined {
    return undefined;
  }

  getSymbolTable(): SymbolTable {
    return this.symbolTable;
  }

  isInBinary(addr: number, fb: FileBlob): boolean {
    return addr > this.memoryConfig.basicProgramStart && addr < (fb.getLength() - PRG_CONTENT_OFFSET);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolveSymbols(_fb: FileBlob): [number, LabelsComments][] {
    return this.symbols;
  }
}