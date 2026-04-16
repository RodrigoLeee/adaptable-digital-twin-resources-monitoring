import 'dotenv/config';
import express from 'express';
import { loadModelBundle } from './model/loader';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import scenariosRouter from './routes/scenarios';
import modelInfoRouter from './routes/modelInfo';
import recommendRouter from './routes/recommend';
import recommendParquetRouter from './routes/recommendParquet';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.use(express.json());
app.use(logger);

app.use(healthRouter);
app.use(scenariosRouter);
app.use(modelInfoRouter);
app.use(recommendRouter);
app.use(recommendParquetRouter);

app.use(errorHandler);

// Eager-load the model bundle at startup
loadModelBundle();

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server listening on port ${PORT}`);
});
