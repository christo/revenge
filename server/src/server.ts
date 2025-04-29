import express from "express";
import {loadCorpus} from "./loadCorpus.js";
import quickloadsRouter from "./routes/quickloads.js";

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();

loadCorpus().then(() => {
  console.log("corpus loaded");
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

// app.use('/', indexRouter);
app.use('/api/quickloads', quickloadsRouter);
