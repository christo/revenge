import express from "express";
import {loadCorpus} from "./loadCorpus.js";
import hashRouter from "./routes/hashRouter.js";
import quickloadsRouter from "./routes/quickloads.js";
import {CorpusDb} from "./sys/CorpusDb.js";
import {getFileVersion} from "./sys/filetype.js";

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();

loadCorpus().then((corpusDb: CorpusDb | null) => {
  if (corpusDb) {
    console.log("corpus loaded, /api/hash available at  /api/hash/sha1/1337dad...");
    app.use('/api/hash', hashRouter(corpusDb));
  } else {
    console.log("/api/hash not available");
  }
});

// TODO incorporate the use of file with sniffers only if it's available
const fileVersion = getFileVersion();
if (fileVersion) {
  console.log(`file version: ${fileVersion}`);
} else {
  console.log("file command unavailable");
}

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

// app.use('/', indexRouter);
app.use('/api/quickloads', quickloadsRouter);

