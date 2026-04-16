const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface ScenarioInfo {
  id: string;
  n_tasks: number;
  energy_kwh: number;
  cost_usd: number;
  wait_mean_s: number;
  completion_rate_pct: number;
  cpu_util_mean_pct: number;
}

export async function getScenarios(): Promise<ScenarioInfo[]> {
  const res = await fetch(`${BASE}/scenarios`);
  if (!res.ok) throw new Error(`Scenarios error: ${res.status}`);
  return res.json();
}

export async function getApiHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`API health error: ${res.status}`);
  return res.json();
}
