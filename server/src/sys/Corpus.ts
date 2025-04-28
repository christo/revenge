import fs from "fs";
import {FileInfo, okExt, scanDirectory} from "./finder.js";

/**
 * Define a library of binaries to analyse or identify.
 * note there can be multiple filepaths for a given hash
 */
class Corpus {

  // TODO enable configuration of multiple corpora, each with a name

  private readonly dir: string;

  /**
   *
   * @param dir base of file tree to look for files
   */
  constructor(dir: string ) {
    if (!fs.existsSync(dir!)) {
      throw Error(`Corpus dir doesn't exist: ${dir}`);
    }
    this.dir=dir!;
  }

  async files(minSize: number = 0, maxSize: number = 64 * 1024): Promise<FileInfo[]> {
    const fileInfos: FileInfo[] = [];
    await scanDirectory(this.dir, fileInfos);
    return fileInfos.filter(fi => okExt(fi) && fi.size < maxSize && fi.size > minSize);
  }
}

export {Corpus};