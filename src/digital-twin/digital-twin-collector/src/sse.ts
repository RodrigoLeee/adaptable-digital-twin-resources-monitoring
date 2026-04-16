import { Response } from 'express';
import { Recommendation } from './types';

const clients = new Set<Response>();

export function addSseClient(res: Response): void {
  clients.add(res);
}

export function removeSseClient(res: Response): void {
  clients.delete(res);
}

export function broadcastRecommendation(recommendation: Recommendation): void {
  const data = JSON.stringify({ type: 'recommendation', payload: recommendation });
  for (const client of clients) {
    client.write(`data: ${data}\n\n`);
  }
}
