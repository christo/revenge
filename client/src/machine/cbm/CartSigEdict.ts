import {LabelsComments} from "../asm/asm.ts";
import {TextDefinitionEdict} from "../asm/instructions.ts";

/**
 * Specifies a commodore cart signature edict. Note C64 and VIC20 have different sigs.
 * Their values are decodable as text (petscii).
 */
export class CartSigEdict extends TextDefinitionEdict {

  constructor(offset: number, length: number, desc: string) {
    super(offset, length, new LabelsComments("cartSig", desc));
  }

  describe(): string {
    return `cart signature`;
  }
}