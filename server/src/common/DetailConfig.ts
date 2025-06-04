/**
 * Holds user configurable settings for a data view.
 */
export interface DetailConfig {
  getTitle(): string;
  getDescription(): string;
  getName(): string;
}