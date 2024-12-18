import {FileBlob} from "../FileBlob.ts";
import {Edict, InstructionLike} from "./instructions.ts";
import {Addr} from "../core.ts";
import {LabelsComments, SymbolTable} from "./asm.ts";

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
  baseAddress(fb: FileBlob): number;

  /**
   * Address of start of code for a warm boot; i.e. when RESTORE is hit (?)
   * @param fb the fileblob.
   */
  disassemblyStartOffset(fb: FileBlob): number;

  /**
   * The offset from the start of the fileblob at which the base address is to be located. This skips any header data
   * that isn't real file content.
   */
  contentStartOffset(): number;

  /**
   * Gets the edict defined for the given offset if one is defined.
   *
   * @param offset
   */
  getEdict(offset: number): Edict<InstructionLike> | undefined;

  /**
   * Return a list of address + LabelsComments
   */
  getJumpTargets(fb: FileBlob): [Addr, LabelsComments][];

  /**
   * Based on the known machine.
   */
  getSymbolTable(): SymbolTable;

  isInBinary(addr: Addr, fb: FileBlob): boolean;
}

export {type DisassemblyMeta};