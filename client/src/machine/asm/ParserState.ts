import {SymbolTable} from "./SymbolTable.ts";

/**
 * Represents the state of a line-based parser
 */
interface ParserState {
  state: "READY" | "MID_MULTILINE_COMMENT",
  symbolTable: SymbolTable
}

export {type ParserState};