import express from "express";
import {loadCorpus} from "./loadCorpus.js";
import quickloadsRouter from "./routes/quickloads.js";
import {getFileVersion} from "./sys/filetype.js";

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();

loadCorpus().then(() => {
  console.log("corpus loaded");
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
