import pLimit from "p-limit";
import { Corpus } from "./sys/Corpus.js";
import { FileInfo, fileInfoToFileLike } from "./sys/finder.js";
import { HashCalc } from "./common/analysis/HashCalc.js";

const FILE_CONCURRENCY = 120;

async function loadCorpus() {
  if (process.env.CORPUS_ON_BOOT === 'true') {
    console.log("corpus file collection started");

    const corpus = new Corpus(process.env.CORPUS_BASE_DIR!);
    const hashCalc = new HashCalc(process.env.DATA_DIR!);

    if (hashCalc.exists()) {
      hashCalc.load();
      return; // nothing more to do
    }

    const fis = await corpus.files(0, 64 * 1024);
    const start = Date.now();
    console.log(`calculating corpus hashes on ${fis.length} files`);

    const limit = pLimit(FILE_CONCURRENCY);

    const tasks = fis.map(file =>
        limit(async () => {
          const fl = fileInfoToFileLike(file);
          await hashCalc.sha1(fl);
          await hashCalc.md5(fl);
          await hashCalc.crc32(fl);
        })
    );

    await Promise.all(tasks);

    console.log("saving hash files");
    hashCalc.save();

    const elapsedSec = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`corpus hashes calculated in ${elapsedSec} s`);

  } else {
    console.warn("skipping corpus hash collection because CORPUS_ON_BOOT !== 'true'");
  }
}

export { loadCorpus };