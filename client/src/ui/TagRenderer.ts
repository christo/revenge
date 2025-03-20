/**
 * View for Tag instances.
 */
export interface TagRenderer {
  /**
   * Unique key.
   */
  key(): string;

  /**
   * UI name.
   */
  label(): string;

}

export class HexDumpTagRenderer implements TagRenderer {


  key(): string {
    return "";
  }

  label(): string {
    return "";
  }

}