import {Tag} from "../Tag.js";
import {Byteable} from "../../Byteable.js";
import {hex16} from "../core.js";
import {LabelsComments, SourceType} from "./asm.js";
import {Dialect} from "./Dialect.js";
import {Disassembler} from "./Disassembler.js";
import {InstructionLike} from "./instructions.js";

/** Convenience base class implementing comment and label properties. */
export abstract class InstructionBase implements InstructionLike, Byteable {
  protected _lc: LabelsComments;
  private readonly _sourceType: SourceType;

  protected constructor(lc: LabelsComments, st: SourceType) {
    this._lc = lc;
    this._sourceType = st;
  }

  get labelsComments(): LabelsComments {
    return this._lc;
  }

  get sourceType(): SourceType {
    return this._sourceType;
  }

  read8 = (offset: number): number => this.getBytes()[offset];

  byteString(): string {
    return this.getBytes().map(hex16).join(" ");
  }

  abstract disassemble(dialect: Dialect, dis: Disassembler): Tag[];

  abstract getBytes(): number[];

  abstract getLength(): number;
}