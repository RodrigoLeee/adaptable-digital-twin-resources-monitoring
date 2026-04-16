import { Router, Request, Response } from 'express';
import { loadModelBundle } from '../model/loader';

const router = Router();
const startTime = Date.now();

router.get('/health', (_req: Request, res: Response) => {
  const bundle = loadModelBundle();
  res.json({
    status: 'ok',
    model_version: bundle.metadata.model_version,
    topology: bundle.metadata.topology,
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

export default router;
