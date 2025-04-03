import {LogicalLine} from "./api.ts";

/**
 * Representation of a generic view of data, a vertical sequence of horizontal string of kv pairs.
 * A generic displayable structure with a sequence of {@link LogicalLine LogicalLines}.
 *
 * Examples supported should include comments, commented out code, lines with possibly multiple labels,
 * hex dumps, data with alternate views (petscii, code, graphics etc.)
 * Macro definitions are an especially important feature to get right, they
 * are not explicit in the binary and their introduction during reversing is dynamic and speculative.
 *
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