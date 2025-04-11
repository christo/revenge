import express from "express";
import fs from "fs";
import path from "path";
import {HashCalc} from "./common/analysis/HashCalc";
import {Corpus} from "./fs/Corpus";
import {FileInfo, fileInfoToFileLike} from "./fs/finder";
import quickloadsRouter from "./routes/quickloads";

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();

// set up corpus
if (process.env.CORPUS_ON_BOOT === 'true') {
  console.log("corpus file collection started");
  const corpus = new Corpus(process.env.CORPUS_BASE_DIR!);
  const hashCalc = new HashCalc(process.env.DATA_DIR!);
  corpus.files().then(fis => {
    console.log(`calculating corpus hashes on ${fis.length} files`)
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
} else {
  console.warn("skipping corpus hash collection because CORPUS_ON_BOOT !== 'true'");
}


app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

// app.use('/', indexRouter);
app.use('/api/quickloads', quickloadsRouter);
