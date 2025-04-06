import {Tag} from "../api.ts";
import {LabelsComments} from "./asm.ts";
import {Dialect} from "./Dialect.ts";
import {Disassembler} from "./Disassembler.ts";
import {ByteDeclaration} from "./instructions.ts";

export class TextDeclaration extends ByteDeclaration {
  constructor(bytes: number[], lc: LabelsComments) {
    super(bytes, lc);
  }

  disassemble = (dialect: Dialect, dis: Disassembler): Tag[] => {
    return dialect.text(this, dis);
  };
}