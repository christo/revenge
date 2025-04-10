import fs from "fs";
import {FileInfo, okExt, scanDirectory} from "./finder";

class Corpus {
  private readonly dir: string;

  constructor(dir = process.env.CORPUS_BASE_DIR) {
    if (!fs.existsSync(dir!)) {
      throw Error("CORPUS_BASE_DIR doesn't exist");
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