import express from "express";
import {loadCorpus} from "./loadCorpus";
import quickloadsRouter from "./routes/quickloads";

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();

loadCorpus();

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

// app.use('/', indexRouter);
app.use('/api/quickloads', quickloadsRouter);
