import express from "express";
import {HashCalc} from "./common/analysis/HashCalc";
import {Corpus} from "./fs/Corpus";
import {FileInfo, fileInfoToFileLike} from "./fs/finder";
import quickloadsRouter from "./routes/quickloads";

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();

// set up corpus
console.log("corpus file collection started");
const corpus = new Corpus();
const hashCalc = new HashCalc();
corpus.files().then(fis => {
  console.log(`calculating corpus hashes on ${fis.length} files`)
  Promise.all(fis.map((file: FileInfo) => {
    const shaP = hashCalc.sha1(fileInfoToFileLike(file));
    const md5P = hashCalc.md5(fileInfoToFileLike(file));
    const crc32P = hashCalc.crc32(fileInfoToFileLike(file));
    return Promise.all([shaP, md5P, crc32P]);
  })).then(() => {
    hashCalc.save();
    console.log("corpus hashes calculated");
  });
})


app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

// app.use('/', indexRouter);
app.use('/api/quickloads', quickloadsRouter);
