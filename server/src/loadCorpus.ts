import {HashCalc} from "./common/analysis/HashCalc";
import {Corpus} from "././sys/Corpus";
import {FileInfo, fileInfoToFileLike} from "././sys/finder";

function loadCorpus() {
  if (process.env.CORPUS_ON_BOOT === 'true') {
    console.log("corpus file collection started");
    const corpus = new Corpus(process.env.CORPUS_BASE_DIR!);
    const hashCalc = new HashCalc(process.env.DATA_DIR!);
    if (hashCalc.exists()) {
      hashCalc.load();
    } else {
      corpus.files(0, 64*1024).then(fis => {
        const start = Date.now();
        console.log(`calculating corpus hashes on ${fis.length} files`);
        // TODO change this implementation, it uses too much RAM
        Promise.all(fis.map(async (file: FileInfo) => {
          const fl = fileInfoToFileLike(file);
          await hashCalc.sha1(fl);
          await hashCalc.md5(fl);
          return await hashCalc.crc32(fl);
        })).then(() => {
          console.log("saving hash files");
          hashCalc.save();
          const elapsedSec = ((Date.now() - start)/1000).toFixed(2);
          console.log(`corpus hashes calculated in ${elapsedSec} s`);
        });
      });
    }

  } else {
    console.warn("skipping corpus hash collection because CORPUS_ON_BOOT !== 'true'");
  }

}

export {loadCorpus};