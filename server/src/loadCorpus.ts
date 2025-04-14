import {HashCalc} from "./common/analysis/HashCalc";
import {Corpus} from "./fs/Corpus";
import {FileInfo, fileInfoToFileLike} from "./fs/finder";

function loadCorpus() {
  if (process.env.CORPUS_ON_BOOT === 'true') {
    console.log("corpus file collection started");
    const corpus = new Corpus(process.env.CORPUS_BASE_DIR!);
    const hashCalc = new HashCalc(process.env.DATA_DIR!);
    if (hashCalc.exists()) {
      hashCalc.load();
    } else {
      corpus.files().then(fis => {
        console.log(`calculating corpus hashes on ${fis.length} files`);
        // TODO change this implementation, it uses too much RAM
        Promise.all(fis.map((file: FileInfo) => {
          const fl = fileInfoToFileLike(file);
          const shaP = hashCalc.sha1(fl);
          const md5P = hashCalc.md5(fl);
          const crc32P = hashCalc.crc32(fl);
          return Promise.all([shaP, md5P, crc32P]);
        })).then(() => {
          console.log("saving hash files");
          hashCalc.save();
          console.log("corpus hashes calculated");
        });
      });
    }

  } else {
    console.warn("skipping corpus hash collection because CORPUS_ON_BOOT !== 'true'");
  }

}

export {loadCorpus};