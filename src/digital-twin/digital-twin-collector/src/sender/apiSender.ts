import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ApiPayload, Recommendation } from '../types';
import logger from '../logger';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const RESULTS_DIR = process.env.RESULTS_DIR || './results';

export async function sendToApi(payload: ApiPayload): Promise<Recommendation> {
  const response = await axios.post<Recommendation>(`${API_URL}/recommend`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10_000,
  });
  return response.data;
}

export async function saveResult(clientId: string, recommendation: Recommendation): Promise<void> {
  const dir = path.join(RESULTS_DIR, clientId);
  fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(dir, `${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(recommendation, null, 2), 'utf-8');
  logger.info(`Result saved: ${filePath}`);
}

export async function checkApiReachable(): Promise<boolean> {
  try {
    await axios.get(`${API_URL}/health`, { timeout: 3_000 });
    return true;
  } catch {
    return false;
  }
}
