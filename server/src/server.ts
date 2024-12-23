import express from "express";
import quickloadsRouter from "./routes/quickloads";

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

// app.use('/', indexRouter);
app.use('/api/quickloads', quickloadsRouter);
