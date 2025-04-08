import {LabelsComments, SourceType} from "./asm.ts";
import {InstructionBase} from "./InstructionBase.ts";
import {InstructionLike} from "./instructions.ts";

/**
 * Assembler directive. Has a source form, may produce bytes during assembly and may be synthesised during
 * disassembly, but does not necessarily correspond to machine instructions and may not even produce code output.
 */
interface Directive extends InstructionLike {

  isSymbolDefinition(): boolean;

  isMacroDefinition(): boolean;

  isPragma(): boolean;
}

abstract class DirectiveBase extends InstructionBase implements Directive {
  private readonly macroDef: boolean;
  private readonly symbolDef: boolean;
  private readonly pragma: boolean;

  protected constructor(lc: LabelsComments, st: SourceType, macroDef:boolean, isPragma:boolean, symbolDef: boolean) {
    super(lc, st);
    this.symbolDef = symbolDef;
    this.macroDef = macroDef;
    this.pragma = isPragma;
  }

  isMacroDefinition(): boolean {
    return this.macroDef;
  }

  isPragma(): boolean {
    return this.pragma;
  }

  isSymbolDefinition(): boolean {
    return this.symbolDef;
  }

}

export {type Directive, DirectiveBase};