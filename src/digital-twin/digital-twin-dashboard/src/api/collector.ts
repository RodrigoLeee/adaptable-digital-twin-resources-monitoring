import {
  CollectorStatus,
  DatacenterState,
  SLAConfig,
  ClientProfile,
  RecommendationOutput,
} from '../types';

const BASE = import.meta.env.VITE_COLLECTOR_URL ?? 'http://localhost:3001';

export async function getCollectorStatus(): Promise<CollectorStatus> {
  const res = await fetch(`${BASE}/status`);
  if (!res.ok) throw new Error(`Collector status error: ${res.status}`);
  return res.json();
}

export async function postManualCollect(body: {
  state: DatacenterState;
  sla: SLAConfig;
  client_profile: ClientProfile;
}): Promise<RecommendationOutput> {
  const res = await fetch(`${BASE}/collect/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Manual collect error: ${res.status}`);
  return res.json();
}

export async function postParquetCollect(
  files: { host: File; powerSource: File; service: File; task: File },
  sla: SLAConfig,
  client_profile: ClientProfile,
): Promise<RecommendationOutput> {
  const form = new FormData();
  form.append('host', files.host);
  form.append('powerSource', files.powerSource);
  form.append('service', files.service);
  form.append('task', files.task);
  form.append('sla', JSON.stringify(sla));
  form.append('client_profile', JSON.stringify(client_profile));

  const res = await fetch(`${BASE}/collect/parquet`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Parquet collect error ${res.status}: ${detail}`);
  }
  return res.json();
}
