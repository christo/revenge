import {FileLike} from "./FileLike";

/**
 * Represents server-provided binaries that can be loaded without doing clientside upload.
 */
export type QuickLoad = {
  VIC20: FileLike[],
  C64: FileLike[],
}