import { Router, Request, Response } from 'express';
import { CollectManualBody } from '../types';
import { processManualCollection } from '../collectors/manualCollector';
import logger from '../logger';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const body = req.body as CollectManualBody;

  if (!body.state || !body.sla || !body.client_profile) {
    res.status(400).json({ error: 'Missing required fields: state, sla, client_profile' });
    return;
  }

  try {
    const result = await processManualCollection(body);
    res.json(result);
  } catch (err) {
    const message = (err as Error).message;
    logger.error('POST /collect/manual failed', { error: message });
    res.status(502).json({ error: 'Failed to get recommendation from API', details: message });
  }
});

export default router;
