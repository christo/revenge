import {DetailConfig} from "../DetailConfig.js";

export class HexDumpDetailConfig implements DetailConfig {

  // TODO bytes per line
  // TODO lowercase/uppercase
  // TODO address

  getTitle(): string {
    return "Hex Dump";
  }

  getName() {
    return "bland hexadecimal"; // TODO temporary, replace this
  }

  getDescription(): string {
    return "lowercase, traditional style";
  }
}