import fs from "fs";
import {FileInfo, okExt, scanDirectory} from "./finder";

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

  async files(): Promise<Array<FileInfo>> {
    const fileInfos: FileInfo[] = [];
    await scanDirectory(this.dir, fileInfos);
    return fileInfos.filter(fi => okExt(fi) && fi.size < 64*1024 && fi.size > 0);
  }
}

export {Corpus};