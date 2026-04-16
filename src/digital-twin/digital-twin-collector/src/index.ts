import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import collectRouter from './routes/collect';
import collectParquetRouter from './routes/collectParquet';
import statusRouter from './routes/status';
import eventsRouter from './routes/events';
import { startScheduledCollector } from './collectors/scheduledCollector';
import logger from './logger';

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  credentials: true
}));

app.options('*', cors());

app.use(express.json());

app.use('/collect/manual', collectRouter);
app.use('/collect/parquet', collectParquetRouter);
app.use('/status', statusRouter);
app.use('/events', eventsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, () => {
  logger.info(`digital-twin-collector running on port ${PORT}`);
  startScheduledCollector();
});
