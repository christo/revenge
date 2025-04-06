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

export {type Directive};