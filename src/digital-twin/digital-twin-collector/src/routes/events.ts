import { Router, Request, Response } from 'express';
import { addSseClient, removeSseClient } from '../sse';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send a heartbeat comment every 30s to keep the connection alive
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30_000);

  addSseClient(res);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSseClient(res);
  });
});

export default router;
