import { Router, Request, Response } from 'express';
import { loadModelBundle } from '../model/loader';

const router = Router();

router.get('/model/info', (_req: Request, res: Response) => {
  const bundle = loadModelBundle();
  res.json(bundle.metadata);
});

export default router;
