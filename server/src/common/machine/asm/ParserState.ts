import {SymbolTable} from "./SymbolTable.js";

/**
 * Represents the state of a line-based parser
 */
interface ParserState {
  state: "READY" | "MID_MULTILINE_COMMENT",
  symbolTable: SymbolTable
}

export {type ParserState};