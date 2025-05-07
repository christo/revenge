import {LabelsComments} from "../asm/asm.js";
import {TextDefinitionEdict} from "../asm/instructions.js";

/**
 * Specifies a commodore cart signature edict. Note C64 and VIC20 have different sigs.
 */
export class CartSigEdict extends TextDefinitionEdict {

  constructor(offset: number, length: number, desc: string) {
    super(offset, length, new LabelsComments("cartSig", desc));
  }

  describe(): string {
    return `cart signature`;
  }
}