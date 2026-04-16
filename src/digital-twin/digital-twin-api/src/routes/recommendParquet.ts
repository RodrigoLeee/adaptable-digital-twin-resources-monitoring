import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import { z } from 'zod';
// hyparquet is ESM-only — loaded via dynamic import at runtime
type AsyncBuffer = { byteLength: number; slice(start: number, end?: number): Promise<ArrayBuffer> };
import { loadModelBundle } from '../model/loader';
import { recommend } from '../model/recommender';
import { DatacenterState, SLAConfig } from '../types';

const router = Router();

const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.fieldname}.parquet`),
});

const upload = multer({ storage });

const SLASchema = z.object({
  max_energy_kwh: z.number().nonnegative(),
  max_wait_s: z.number().nonnegative(),
  max_cost_usd: z.number().nonnegative(),
});

function fileToAsyncBuffer(filePath: string): AsyncBuffer {
  const buf = fs.readFileSync(filePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return {
    byteLength: ab.byteLength,
    slice: (start: number, end?: number) => Promise.resolve(ab.slice(start, end)),
  };
}

async function readParquetColumn(filePath: string, column: string): Promise<unknown[]> {
  const { parquetRead } = await import('hyparquet') as { parquetRead: Function };
  const asyncBuffer = fileToAsyncBuffer(filePath);
  const values: unknown[] = [];
  await parquetRead({
    file: asyncBuffer,
    columns: [column],
    onChunk: (chunk: { columnData: ArrayLike<unknown> }) => {
      const data = chunk.columnData;
      for (let i = 0; i < data.length; i++) {
        values.push(data[i]);
      }
    },
  });
  return values;
}

async function extractStateFromParquets(files: Record<string, string>): Promise<DatacenterState> {
  // task.parquet: timestamps in ms
  const submissionTimes = (await readParquetColumn(files.task, 'submission_time')) as number[];
  const scheduleTimes = (await readParquetColumn(files.task, 'schedule_time')) as number[];
  const finishTimes = (await readParquetColumn(files.task, 'finish_time')) as number[];

  const nTasksActive = submissionTimes.length;

  let execSum = 0;
  for (let i = 0; i < finishTimes.length; i++) {
    execSum += (finishTimes[i] - scheduleTimes[i]);
  }
  const execMeanS = finishTimes.length > 0 ? execSum / finishTimes.length / 1000 : 0;

  const maxFinish = finishTimes.length > 0 ? Math.max(...finishTimes) : 0;
  const simDurationH = maxFinish / 3_600_000;

  let waitSum = 0;
  for (let i = 0; i < scheduleTimes.length; i++) {
    waitSum += (scheduleTimes[i] - submissionTimes[i]);
  }
  const waitMeanS = scheduleTimes.length > 0 ? waitSum / scheduleTimes.length / 1000 : 0;

  // powerSource.parquet: energy_usage last record
  const energyUsage = (await readParquetColumn(files.powerSource, 'energy_usage')) as number[];
  const energyConsumedKwh = energyUsage.length > 0
    ? energyUsage[energyUsage.length - 1] / 3_600_000
    : 0;

  // service.parquet: hosts_up last record
  const hostsUp = (await readParquetColumn(files.service, 'hosts_up')) as number[];
  const hostsActive = hostsUp.length > 0 ? hostsUp[hostsUp.length - 1] : 0;

  return {
    n_tasks_active: nTasksActive,
    exec_mean_s: execMeanS,
    sim_duration_h: simDurationH,
    energy_consumed_kwh: energyConsumedKwh,
    wait_mean_s: waitMeanS,
    hosts_active: hostsActive,
  };
}

const uploadFields = upload.fields([
  { name: 'host', maxCount: 1 },
  { name: 'powerSource', maxCount: 1 },
  { name: 'service', maxCount: 1 },
  { name: 'task', maxCount: 1 },
]);

router.post('/recommend/parquet', uploadFields, async (req: Request, res: Response, next: NextFunction) => {
  const uploadedPaths: string[] = [];
  try {
    const files = req.files as Record<string, Express.Multer.File[]>;
    const required = ['host', 'powerSource', 'service', 'task'];
    for (const field of required) {
      if (!files?.[field]?.[0]) {
        res.status(400).json({ error: `Missing required file: ${field}` });
        return;
      }
    }

    const filePaths: Record<string, string> = {};
    for (const field of required) {
      filePaths[field] = files[field][0].path;
      uploadedPaths.push(files[field][0].path);
    }

    if (!req.body.sla) {
      res.status(400).json({ error: 'Missing sla field in form data' });
      return;
    }

    let slaRaw: unknown;
    try {
      slaRaw = typeof req.body.sla === 'string' ? JSON.parse(req.body.sla) : req.body.sla;
    } catch {
      res.status(400).json({ error: 'sla field must be valid JSON' });
      return;
    }

    const sla: SLAConfig = SLASchema.parse(slaRaw);
    const state = await extractStateFromParquets(filePaths);
    const bundle = loadModelBundle();
    const result = recommend(state, sla, bundle);
    res.json(result);
  } catch (err) {
    next(err);
  } finally {
    for (const p of uploadedPaths) {
      fs.unlink(p, () => {});
    }
  }
});

export default router;
