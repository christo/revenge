import {Tag} from "../api.ts";
import {Byteable} from "../Byteable.ts";
import {assertByte} from "../core.ts";
import {LabelsComments, SourceType} from "./asm.ts";
import {Dialect} from "./Dialect.ts";
import {Directive, DirectiveBase} from "./Directive.ts";
import {Disassembler} from "./Disassembler.ts";
import {InstructionLike} from "./instructions.ts";

/** Assembler pseudo-op that reserves literal bytes. */
export class ByteDeclaration extends DirectiveBase implements InstructionLike, Directive, Byteable {

  private readonly _rawBytes: Array<number>;

  constructor(rawBytes: number[], lc: LabelsComments) {
    super(lc, SourceType.DATA, false,  false, false);
    this._rawBytes = rawBytes.map(b => assertByte(b));
  }

  getBytes = (): number[] => this._rawBytes;
  getLength = (): number => this._rawBytes.length;

  disassemble = (dialect: Dialect, dis: Disassembler): Tag[] => dialect.bytes(this, dis);
}