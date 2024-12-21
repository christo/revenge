import {EMPTY_JUMP_TARGET_FETCHER, SymbolResolver, LabelsComments, SymbolTable} from "./asm.ts";
import {Addr, hex16} from "../core.ts";
import {FileBlob} from "../FileBlob.ts";
import {Edict, InstructionLike} from "./instructions.ts";
import {DisassemblyMeta} from "./DisassemblyMeta.ts";

/**
 * Encapsulates outer context for performing {@link Disassembler}.
 * FUTURE: this is very CBM 6502 oriented
 */
class DisassemblyMetaImpl implements DisassemblyMeta {

  // noinspection JSUnusedLocalSymbols
  /** A bit stinky - should never be used and probably not exist. */
  static NULL_DISSASSEMBLY_META = new DisassemblyMetaImpl(0, 0, 0, [], (_fb) => [], new SymbolTable("null"));

  private readonly _baseAddressOffset: number;
  private readonly _resetVectorOffset: number;
  private readonly _contentStartOffset: number;
  private readonly edicts: { [id: number]: Edict<InstructionLike>; };
  private readonly symbolResolver: SymbolResolver;
  private readonly symbolTable: SymbolTable;

  /**
   * Create context with minimalist defaults.
   *
   * @param baseAddressOffset memory address to load into.
   * @param resetVectorOffset reset vector, defaults to baseAddressOffset
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

    this._baseAddressOffset = baseAddressOffset;
    this._contentStartOffset = contentStartOffset;
    this.symbolTable = symbolTable;

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

  disassemblyStartOffset(fb: FileBlob): number {
    const resetAddr = fb.read16(this._resetVectorOffset);
    // two bytes make an address
    const resetMsb = resetAddr + 1;
    const resetVectorIsInBinary = this.inBinary(resetMsb, fb);
    if (resetVectorIsInBinary) {
      return resetAddr - fb.read16(this._baseAddressOffset);
    } else {
      // reset vector is outside binary, so start disassembly at content start?
      console.log(`reset vector is outside binary ($${hex16(resetAddr)})`);
      return this.contentStartOffset();
    }
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