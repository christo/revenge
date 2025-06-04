import {DetailConfig} from "../DetailConfig.js";
import {Dialect} from "./asm/Dialect.js";

export class DisassemblyDetailConfig implements DetailConfig {
  private dialect: Dialect;

  constructor(dialect: Dialect) {
    this.dialect = dialect;
  }

  getTitle(): string {
    return "Disassembly";
  }

  getDescription(): string {
    return this.dialect.description;
  }

  getName(): string {
    return this.dialect.name;
  }

}