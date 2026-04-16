import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { SLA, ClientProfile, ApiPayload } from '../types';
import { extractStateFromParquets } from '../collectors/parquetCollector';
import { sendToApi, saveResult } from '../sender/apiSender';
import { setLastState, setLastRecommendation } from '../store/lastState';
import { broadcastRecommendation } from '../sse';
import logger from '../logger';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${file.fieldname}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({ storage });

const router = Router();

router.post(
  '/',
  upload.fields([
    { name: 'host', maxCount: 1 },
    { name: 'powerSource', maxCount: 1 },
    { name: 'service', maxCount: 1 },
    { name: 'task', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    const files = req.files as Record<string, Express.Multer.File[]>;

    const required = ['host', 'powerSource', 'service', 'task'];
    const missing = required.filter(f => !files?.[f]?.[0]);
    if (missing.length > 0) {
      res.status(400).json({ error: `Missing parquet files: ${missing.join(', ')}` });
      return;
    }

    let sla: SLA;
    let clientProfile: ClientProfile;

    try {
      sla = JSON.parse(req.body.sla as string) as SLA;
      clientProfile = JSON.parse(req.body.client_profile as string) as ClientProfile;
    } catch {
      res.status(400).json({ error: 'Invalid JSON in sla or client_profile fields' });
      return;
    }

    const filePaths = {
      host: files['host'][0].path,
      powerSource: files['powerSource'][0].path,
      service: files['service'][0].path,
      task: files['task'][0].path,
    };

    try {
      const state = await extractStateFromParquets(filePaths);
      logger.info('State extracted from parquets', { client_id: clientProfile.client_id, state });

      const payload: ApiPayload = { state, sla, client_profile: clientProfile };
      const recommendation = await sendToApi(payload);

      setLastState(state, clientProfile);
      setLastRecommendation(recommendation);
      await saveResult(clientProfile.client_id, recommendation);
      broadcastRecommendation(recommendation);

      logger.info('Parquet collection complete', {
        client_id: clientProfile.client_id,
        status: recommendation.status,
      });

      res.json({ ...recommendation, client_profile: clientProfile });
    } catch (err) {
      const message = (err as Error).message;
      logger.error('POST /collect/parquet failed', { error: message });
      res.status(502).json({ error: 'Failed to process parquets or get recommendation', details: message });
    } finally {
      // Clean up uploaded files
      for (const filePath of Object.values(filePaths)) {
        fs.unlink(filePath, () => undefined);
      }
    }
  },
);

export default router;
