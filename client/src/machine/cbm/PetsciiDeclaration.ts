import {Tag} from "../api.ts";
import {LabelsComments} from "../asm/asm.ts";
import {Dialect} from "../asm/Dialect.ts";
import {Disassembler} from "../asm/Disassembler.ts";
import {ByteDeclaration} from "../asm/instructions.ts";

export class PetsciiDeclaration extends ByteDeclaration {
  constructor(bytes: number[], lc: LabelsComments) {
    super(bytes, lc);
  }

  disassemble = (dialect: Dialect, dis: Disassembler): Tag[] => {
    return dialect.text(this, dis);
  };
}