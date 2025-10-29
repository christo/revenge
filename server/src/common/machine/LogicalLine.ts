import {InstructionLike} from "./asm/instructions.js";
import {Addr} from "./core.js";
import {Tag} from "./Tag.js";

/**
 * Holds a logical line of source with its address and the {@link InstructionLike}. Need to be bidirectionally mapped to
 * addresses and yet also we want to generate listings where there are lines that have no address, but they do usually
 * belong in a specific place in the listing. Macro definitions, for example, need to exist in the listing, but they
 * have no address location and could be reordered so long as they adhere to dialect-enforced-rules about forward
 * references inherited from assemblers.
 *
 * The mapping between addresses and source lines is bijective:
 *
 * - every byte corresponds to some component of a source line
 * - multiple source can be located between/before a given address (e.g. macro definitions, comments, labels)
 * - every byte has a unique address
 * - a source line can map to zero or more bytes
 * - instructions have variable byte length correspondence, so alternative instructions (e.g. code vs data) will
 * consume different numbers of bytes. Changing from an insruction to a byte definition may have a knock-on effect
 * that forces a different interpretation of following bytes.
 * - Edicts produce these knock on effects, although they're defined at offsets rather than addresses
 * - can have comments and no instructions
 * - can have labels but if it has a label it needs address
 * - labels are different to symbol assignment - label has an implicit "= *"
 *
 */
class LogicalLine {
  /** Include only lines that are really lines, as opposed to "note" tags which are not a "line". */
  public static JUST_LINES = (ll: LogicalLine) => ll.getTags().find((t: Tag) => t.isLine()) !== undefined;

  private readonly tags: Tag[];
  private readonly address: Addr | undefined;
  private readonly byteSize: number;
  private readonly instruction?: InstructionLike;

  constructor(tags: Tag[], byteSize: number, address: Addr | undefined, instruction?: InstructionLike) {
    this.byteSize = byteSize;
    this.tags = tags;
    this.address = address;
    this.instruction = instruction;
  }

  getTags(): Tag[] {
    return this.tags;
  }

  getByteSize() {
    return this.byteSize;
  }

}

export {LogicalLine};