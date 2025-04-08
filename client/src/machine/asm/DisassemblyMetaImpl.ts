import {Addr} from "../core.ts";
import {FileBlob} from "../FileBlob.ts";
import {EMPTY_JUMP_TARGET_FETCHER, LabelsComments, SymbolResolver} from "./asm.ts";
import {DisassemblyMeta} from "./DisassemblyMeta.ts";
import {Edict} from "./Edict.ts";
import {InstructionLike} from "./instructions.ts";
import {SymbolTable} from "./SymbolTable.ts";

/**
 * A named location.
 */
type IndexedDescriptor = {
  index: number,
  name: string,
  description: string,
}

const NULL_INDEXED_DESCRIPTOR: IndexedDescriptor = {
  index: 0,
  name: "NULL",
  description: "",
}

/**
 * Encapsulates outer context for disassembling with a {@link Disassembler}.
 * FUTURE: this is very CBM 6502 oriented
 */
class DisassemblyMetaImpl implements DisassemblyMeta {

  /** A bit stinky - should never be used and probably not exist. */
  static NULL_DISSASSEMBLY_META = new DisassemblyMetaImpl(
      0,
      [NULL_INDEXED_DESCRIPTOR],
      0,
      [],
      (_fb) => [],
      new SymbolTable("empty")
  );

  private readonly _baseAddressOffset: number;
  private readonly _jumpVectorOffsets: IndexedDescriptor[];
  private readonly _contentStartOffset: number;
  private readonly edicts: { [id: number]: Edict<InstructionLike>; };
  private readonly symbolResolver: SymbolResolver;
  private readonly symbolTable: SymbolTable;

  /**
   * Create context with minimalist defaults.
   *
   * @param baseAddressOffset binary image offset at which to find address to load into.
   * @param jumpVectorOffsets file offsets at which the execution vector start points are defined
   * @param contentStartOffset start of content, defaults to baseAddressOffset
   * @param edicts any predefined edicts for disassembly, defaults to empty, only one per address.
   * @param symbolResolver do find externally defined symbols, defaults to empty.
   * @param symbolTable predefined symbol table (defaults to empty).
   */
  constructor(
      baseAddressOffset: number = 0,
      jumpVectorOffsets: Array<IndexedDescriptor>,
      contentStartOffset: number = baseAddressOffset,
      edicts: Edict<InstructionLike>[] = [],
      symbolResolver: SymbolResolver = EMPTY_JUMP_TARGET_FETCHER,
      symbolTable: SymbolTable = new SymbolTable("default")
  ) {

    // future: not all systems specify load address in a file
    this._baseAddressOffset = baseAddressOffset;
    this._contentStartOffset = contentStartOffset;
    this.symbolTable = symbolTable;

    // keep the offsets
    this._jumpVectorOffsets = jumpVectorOffsets;
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

  /**
   * Determines the addresses of the assembly entry points defined by the fileblob.
   * These could be any address but it would often reference the fileblob code.
   *
   * @param fb the FileBlob
   */
  executionEntryPoints(fb: FileBlob): IndexedDescriptor[] {
    // transform offsets into addresses
    return this._jumpVectorOffsets.map(od => ({index: fb.read16(od.index), name: od.name, description: ""}));
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
}

export {DisassemblyMetaImpl, NULL_INDEXED_DESCRIPTOR, type IndexedDescriptor};