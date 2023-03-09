import express from "express";
import indexRouter from "./routes/index.js";
import quickloadsRouter from "./routes/quickloads.js";

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

app.use('/', indexRouter);
app.use('/quickloads', quickloadsRouter);
