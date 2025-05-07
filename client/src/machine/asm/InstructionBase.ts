import {Tag} from "../api.ts";
import {Byteable} from "../../../../server/src/common/Byteable.ts";
import {hex16} from "../../../../server/src/common/machine/core.ts";
import {LabelsComments, SourceType} from "./asm.ts";
import {Dialect} from "./Dialect.ts";
import {Disassembler} from "./Disassembler.ts";
import {InstructionLike} from "./instructions.ts";

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