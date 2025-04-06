import {Tag} from "../api.ts";
import {Byteable} from "../Byteable.ts";
import {assertByte} from "../core.ts";
import {LabelsComments, SourceType} from "./asm.ts";
import {Dialect} from "./Dialect.ts";
import {Directive} from "./Directive.ts";
import {Disassembler} from "./Disassembler.ts";
import {InstructionBase} from "./InstructionBase.ts";

/** Assembler pseudo-op that reserves literal bytes. */
export class ByteDeclaration extends InstructionBase implements Directive, Byteable {

  private readonly _rawBytes: Array<number>;

  constructor(rawBytes: number[], lc: LabelsComments) {
    super(lc, SourceType.DATA);
    this._rawBytes = rawBytes.map(b => assertByte(b));
  }

  isMacroDefinition(): boolean {
    return false;
  }

  isPragma(): boolean {
    return false;
  }

  isSymbolDefinition(): boolean {
    return false;
  }

  getBytes = (): number[] => this._rawBytes;
  getLength = (): number => this._rawBytes.length;

  disassemble = (dialect: Dialect, dis: Disassembler): Tag[] => dialect.bytes(this, dis);
}