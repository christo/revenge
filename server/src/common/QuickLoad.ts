import {FileLike} from "./FileLike.js";

/**
 * Represents server-provided binaries that can be loaded without doing clientside upload.
 */
export type QuickLoad = {
  VIC20: FileLike[],
  C64: FileLike[],
}