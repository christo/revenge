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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static NULL_DISSASSEMBLY_META = new DisassemblyMetaImpl(0, [[0, "NULL"]], 0, [], (_fb) => [], new SymbolTable("empty"));

  private readonly _baseAddressOffset: number;
  private readonly _jumpVectorOffsets: NamedOffset[];
  private readonly _contentStartOffset: number;
  private readonly edicts: { [id: number]: Edict<InstructionLike>; };
  private readonly symbolResolver: SymbolResolver;
  private readonly symbolTable: SymbolTable;
  private codeAddresses: Addr[];

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
      jumpVectorOffsets: Array<NamedOffset>,
      contentStartOffset: number = baseAddressOffset,
      edicts: Edict<InstructionLike>[] = [],
      symbolResolver: SymbolResolver = EMPTY_JUMP_TARGET_FETCHER,
      symbolTable: SymbolTable = new SymbolTable("default")
  ) {

    // future: not all systems specify load address in a file
    this._baseAddressOffset = baseAddressOffset;
    this._contentStartOffset = contentStartOffset;
    this.symbolTable = symbolTable;
    this.codeAddresses = [];

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
  executionEntryPoints(fb: FileBlob): [Addr, string][] {
    // transform offsets into addresses
    return this._jumpVectorOffsets.map(il => ([fb.read16(il[0]), il[1]]));
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

export {DisassemblyMetaImpl, type NamedOffset};