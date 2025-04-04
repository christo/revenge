import {FileLike} from "./machine/FileBlob.ts";

/**
 * TODO share this type between server and client
 */
export type QuickLoad = {
  VIC20: FileLike[],
  C64: FileLike[],
}