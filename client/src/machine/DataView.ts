import {LogicalLine} from "./api.ts";

/**
 * Representation of a generic view of data, a vertical sequence of horizontal string of kv pairs.
 * A generic displayable structure with a sequence of {@link LogicalLine LogicalLines}.
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