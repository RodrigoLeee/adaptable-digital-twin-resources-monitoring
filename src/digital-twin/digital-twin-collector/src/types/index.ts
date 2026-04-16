export interface DatacenterState {
  n_tasks_active: number;
  exec_mean_s: number;
  sim_duration_h: number;
  energy_consumed_kwh: number;
  wait_mean_s: number;
  hosts_active: number;
  cpu_util_mean?: number;
  tasks_completed?: number;
}

export interface SLA {
  max_energy_kwh: number;
  max_wait_s: number;
  max_cost_usd: number;
  max_cpu_pct?: number;
}

export interface ClientProfile {
  client_id: string;
  name: string;
  priority: 'availability' | 'performance' | 'cost' | 'energy';
}

export interface CollectManualBody {
  state: DatacenterState;
  sla: SLA;
  client_profile: ClientProfile;
}

export interface ApiPayload {
  state: DatacenterState;
  sla: SLA;
  client_profile: ClientProfile;
}

export interface Recommendation {
  status: 'ok' | 'attention' | 'critical';
  [key: string]: unknown;
}

export interface CollectorStore {
  lastState: DatacenterState | null;
  lastRecommendation: Recommendation | null;
  lastCollection: string | null;
  lastClientProfile: ClientProfile | null;
  collectionsTotal: number;
}
