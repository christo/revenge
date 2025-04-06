import {LabelsComments} from "../asm/asm.ts";
import {ByteDefinitionEdict, InstructionLike} from "../asm/instructions.ts";
import {FileBlob} from "../FileBlob.ts";
import {TextDeclaration} from "../asm/TextDeclaration.ts";

/**
 * Specifies a commodore cart signature edict. Note C64 and VIC20 have different sigs.
 * Their values are decodable as text (petscii).
 */
export class CartSigEdict extends ByteDefinitionEdict {

  constructor(offset: number, length: number, desc: string) {
    super(offset, length, new LabelsComments("cartSig", desc));
  }

  create(fb: FileBlob): InstructionLike {
    const bytes = fb.getBytes().slice(this.offset, this.offset + this.length);
    return new TextDeclaration(bytes, this.lc);
  }

  describe(): string {
    return `VIC-20 cart signature`;
  }
}