import {Addr} from "../core.ts";
import {FileBlob} from "../FileBlob.ts";
import {EMPTY_JUMP_TARGET_FETCHER, LabelsComments, SymbolResolver, SymbolTable} from "./asm.ts";
import {DisassemblyMeta} from "./DisassemblyMeta.ts";
import {Edict} from "./Edict.ts";
import {InstructionLike} from "./instructions.ts";

/**
 * A named index into a binary sequence.
 */
type NamedOffset = [number, string];

/**
 * Encapsulates outer context for disassembling with a {@link Disassembler}.
 * FUTURE: this is very CBM 6502 oriented
 */
class DisassemblyMetaImpl implements DisassemblyMeta {

  /** A bit stinky - should never be used and probably not exist. */
  static NULL_DISSASSEMBLY_META = new DisassemblyMetaImpl(0, 0, 0, [], (_fb) => [], new SymbolTable("null"));

  private readonly _baseAddressOffset: number;
  private readonly _resetVectorOffset: number;
  private readonly _contentStartOffset: number;
  private readonly edicts: { [id: number]: Edict<InstructionLike>; };
  private readonly symbolResolver: SymbolResolver;
  private readonly symbolTable: SymbolTable;
  private codeAddresses: Addr[];

  /**
   * Create context with minimalist defaults.
   *
   * @param baseAddressOffset binary image offset at which to find address to load into.
   * @param resetVectorOffset file offset at which the reset vector is defined, defaults to baseAddressOffset
   * @param contentStartOffset start of content, defaults to baseAddressOffset
   * @param edicts any predefined edicts for disassembly, defaults to empty, only one per address.
   * @param symbolResolver do find externally defined symbols, defaults to empty.
   * @param symbolTable predefined symbol table (defaults to empty).
   */
  constructor(
      baseAddressOffset: number = 0,
      resetVectorOffset: number = baseAddressOffset,
      contentStartOffset: number = baseAddressOffset,
      edicts: Edict<InstructionLike>[] = [],
      symbolResolver: SymbolResolver = EMPTY_JUMP_TARGET_FETCHER,
      symbolTable: SymbolTable = new SymbolTable("default")
  ) {

    // TODO to what extent is this an unjustified assumption about the load address living in the FileBlob?
    this._baseAddressOffset = baseAddressOffset;
    this._contentStartOffset = contentStartOffset;
    this.symbolTable = symbolTable;
    this.codeAddresses = [];

    // keep the offsets
    this._resetVectorOffset = resetVectorOffset;
    this.edicts = {};
    for (let i = 0; i < edicts.length; i++) {
      const edict = edicts[i];
      this.edicts[edict.offset] = edict;
    }
    this.symbolResolver = symbolResolver;
  }

  /**
   * Read the absolute base address from the given {@link FileBlob} using configured offset.
   * FUTURE: assumes base load address is present in fb
   * @param fb the FileBlob
   */
  baseAddress(fb: FileBlob): number {
    return fb.read16(this._baseAddressOffset);
  }

  /**
   * Index in the load format at which the first byte of loadable content resides.
   * This enables skipping leading metadata such as the CBM-style CRT image with the first two bytes holding the
   * load address.
   */
  contentStartOffset(): number {
    return this._contentStartOffset;
  }

  isInBinary(addr: Addr, fb: FileBlob): boolean {
    const baseAddress = fb.read16(this._baseAddressOffset);
    const contentStartAddress = baseAddress + this._contentStartOffset;
    const contentEndAddress = baseAddress + fb.getLength();
    // last address location is 1 below last byte
    return addr >= contentStartAddress && addr <= contentEndAddress - 1;
  }

  addCodeAddresses(codeAddresses: Addr[]): void {
    this.codeAddresses.push(...codeAddresses);
  }

  getCodeAddresses(): Addr[] {
    return this.codeAddresses;
  }

  /**
   * Determines the address of the assembly entry point defined by the fileblob.
   * This could be any address but it would usually be inside the fileblob code
   * with the assumption or explicit instruction of the load address.
   *
   * @param fb the FileBlob
   */
  executionEntryPoint(fb: FileBlob): number {
    return fb.read16(this._resetVectorOffset);
  }

  getEdict(address: number): Edict<InstructionLike> | undefined {
    return this.edicts[address];
  }

  resolveSymbols(fb: FileBlob): [Addr, LabelsComments][] {
    return this.symbolResolver(fb);
  }

  getSymbolTable(): SymbolTable {
    return this.symbolTable;
  }

  private inBinary(addr: number, fb: FileBlob) {
    const base = this.baseAddress(fb);
    return addr >= base && addr <= base + fb.getLength();
  }
}

export {DisassemblyMetaImpl};