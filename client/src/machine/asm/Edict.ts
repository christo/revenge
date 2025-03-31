import {FileBlob} from "../FileBlob.ts";
import {InstructionLike} from "./instructions.ts";

/**
 * Rule for specifying the interpretation of a sequence of bytes at a binary offset. File formats or
 * user demand can require that a location be interpreted as code or a labeled address definition etc.
 * Examples include forced interpretation of bytes as code since the file format specifies code entry
 * points.
 */
interface Edict<T extends InstructionLike> {

  get offset(): number;

  /**
   * Number of bytes to be specified.
   */
  get length(): number;

  /**
   * Creates the instance from the bytes in the given fileblob at our configured offset
   *
   * @param fb the binary.
   * @return the instance.
   */
  create(fb: FileBlob): T;

  /**
   * Description of the edict for referring to problems with it.
   */
  describe(): string;
}

export {type Edict};