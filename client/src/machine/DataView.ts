import {LogicalLine} from "./api.ts";

/**
 * Representation of a generic view of data, a vertical sequence of horizontal string of kv pairs.
 * A generic displayable structure with a sequence of entries. Each entry is a sequence of
 * string tuples. The string tuple represents a name-value pair that will be rendered with
 * the name as a className and the value as the text content of a span element.
 */
interface DataView {
  getLines(): LogicalLine[];

  addLine(ll: LogicalLine): void;
}

class DataViewImpl implements DataView {
  private readonly lines: LogicalLine[];

  constructor(lines: LogicalLine[]) {
    this.lines = lines;
  }

  getLines(): LogicalLine[] {
    return this.lines;
  }

  addLine(ll: LogicalLine): void {
    this.lines.push(ll);
  }
}

export {DataViewImpl};
export {type DataView};