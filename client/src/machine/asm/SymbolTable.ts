import {Addr} from "../core.ts";
import {SymDef} from "./instructions.ts";

/** There are different types of symbols duh. */
enum SymbolType {
  reg,
  /**
   * Subroutine symbol.
   */
  sub
}

/**
 * Table of single symbol to single address. Names and addresses must be unique.
 */
class SymbolTable {

  // future: keep kernal symbols in a separate table from user-defined symbols, also can have multimap

  private addressToSymbol: Map<Addr, SymDef<Addr>> = new Map<Addr, SymDef<Addr>>();
  private readonly name: string;
  /**
   * string lookup
   * @private
   */
  private nameToSymbol: Map<string, SymDef<Addr>> = new Map<string, SymDef<Addr>>();

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Register a new symbol for the described subroutine. One must not already exist with the same name or address.
   *
   * @param addr address the symbol refers to.
   * @param name name to be used instead of the address.
   * @param desc a more verbose description of the symbol.
   * @param blurb extended info.
   */
  sub(addr: Addr, name: string, desc: string, blurb = "") {
    this.sym(SymbolType.sub, addr, name, desc, blurb);
  }

  /**
   * Register definition
   * @param addr address of register
   * @param name name of register
   * @param desc description
   * @param blurb optional extra blurb
   */
  reg(addr: Addr, name: string, desc: string, blurb = "") {
    this.sym(SymbolType.reg, addr, name, desc, blurb);
  }

  /**
   * Register a
   * @param lowerAddr
   * @param name
   * @param desc
   * @param blurb
   */
  reg16(lowerAddr: Addr, name: string, desc: string, blurb: string = "") {
    this.sym(SymbolType.reg, lowerAddr, `${name}_LO`, `LO BYTE ${desc}`, blurb.length > 0 ? `LO BYTE ${blurb}` : "");
    this.sym(SymbolType.reg, lowerAddr + 1, `${name}_HI`, `HI BYTE ${desc}`, blurb.length > 0 ? `LO BYTE ${blurb}` : "");
  }

  sym(sType: SymbolType, addr: Addr, name: string, desc: string, blurb = "") {
    if (addr < 0 || addr >= 1 << 16) {
      throw Error("address out of range");
    }
    name = name.trim();
    if (name.length < 1) {
      throw Error("name empty");
    }
    if (this.addressToSymbol.has(addr) || this.nameToSymbol.has(name)) {
      // TODO support multiple symbols at same address
      throw Error(`${this.name}: non-unique address (${addr}) or name (${name})`);
    }
    const symDef = new SymDef(sType, name, addr, desc.trim(), blurb.trim());
    this.addressToSymbol.set(addr, symDef);
    this.nameToSymbol.set(name, symDef);
  }

  // noinspection JSUnusedGlobalSymbols
  byName(name: string) {
    return this.nameToSymbol.get(name);
  }

  /**
   * Returns the name of the symbol defined for the given value, may not be an address
   * @param addr value assigned to the symbol
   */
  byValue(value: number) {
    return this.addressToSymbol.get(value);
  }
}

export {SymbolTable};
export {SymbolType};