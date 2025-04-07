import {OperandResolver} from "./OperandResolver.ts";
import {SymbolTable} from "./SymbolTable.ts";

/**
 * Defer to second pass
 */
export class SymbolLookup implements OperandResolver {
  readonly symbol: string;
  deferred: boolean;
  private symbolTable: SymbolTable;

  constructor(symbol: string, symbolTable: SymbolTable) {
    this.symbol = symbol;
    this.symbolTable = symbolTable;
    this.deferred = true;
  }

  value(): number | undefined {
    return this.symbolTable.byName(this.symbol)?.value;
  }
}