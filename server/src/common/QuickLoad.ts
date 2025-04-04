import {FileLike} from "./FileLike";

/**
 * TODO share this type between server and client
 */
export type QuickLoad = {
  VIC20: FileLike[],
  C64: FileLike[],
}