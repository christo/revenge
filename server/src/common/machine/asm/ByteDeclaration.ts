import {Tag} from "../Tag.js";
import {Byteable} from "../../Byteable.js";
import {assertByte} from "../core.js";
import {LabelsComments, SourceType} from "./asm.js";
import {Dialect} from "./Dialect.js";
import {Directive, DirectiveBase} from "./Directive.js";
import {Disassembler} from "./Disassembler.js";
import {InstructionLike} from "./instructions.js";

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