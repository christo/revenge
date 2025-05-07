import {Tag} from "../Tag.js";
import {LabelsComments} from "./asm.js";
import {ByteDeclaration} from "./ByteDeclaration.js";
import {Dialect} from "./Dialect.js";
import {Disassembler} from "./Disassembler.js";

export class TextDeclaration extends ByteDeclaration {
  constructor(bytes: number[], lc: LabelsComments) {
    super(bytes, lc);
  }

  disassemble = (dialect: Dialect, dis: Disassembler): Tag[] => {
    return dialect.text(this, dis);
  };
}