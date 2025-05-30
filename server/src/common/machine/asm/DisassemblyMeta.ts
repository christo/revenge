import {Addr} from "../core.js";
import {FileBlob} from "../FileBlob.js";
import {LabelsComments} from "./asm.js";
import {IndexedDescriptor} from "./DisassemblyMetaImpl.js";
import {Edict} from "./Edict.js";
import {InstructionLike} from "./instructions.js";
import {SymbolTable} from "./SymbolTable.js";

/**
 * Provider of metadata about binaries, valuable for disassembling a {@link FileBlob}.
 *
 * Expect this interface to evolve dramatically.
 */
interface DisassemblyMeta {

  /**
   * The address the file should be loaded into.
   * In the future, we need to support multiple segments loaded into
   * different addresses; some file formats accommodate this.
   *
   * @param fb the file to get the vector from
   */
  baseAddress(fb: FileBlob): Addr;

  /**
   * Addresses of start of code entry points. Each is an address/label tuple.
   *
   * @param fb the fileblob.
   */
  executionEntryPoints(fb: FileBlob): IndexedDescriptor[];

  /**
   * The offset from the start of the fileblob at which the starting of the binary content is located.
   * This may not be the entry point.
   * This skips any header data that isn't real file content.
   */
  contentStartOffset(): number;

  /**
   * Gets any predefined edict for the given offset or undefined.
   *
   * @param offset
   */
  getEdict(offset: number): Edict<InstructionLike> | undefined;

  /**
   * Return a list of address + LabelsComments to use for address aliases
   */
  resolveSymbols(fb: FileBlob): [Addr, LabelsComments][];

  /**
   * Based on the known machine.
   */
  getSymbolTable(): SymbolTable;

  /**
   * Returns true if the given address is present in the given FileBlob
   *
   * @param addr the address
   * @param fb the fileblob
   */
  isInBinary(addr: Addr, fb: FileBlob): boolean;

}

export {type DisassemblyMeta};