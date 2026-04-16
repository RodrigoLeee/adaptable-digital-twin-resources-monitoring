export interface DatacenterState {
  n_tasks_active: number;
  exec_mean_s: number;
  sim_duration_h: number;
  energy_consumed_kwh: number;
  wait_mean_s: number;
  hosts_active: number;
}

export interface SLAConfig {
  max_energy_kwh: number;
  max_wait_s: number;
  max_cost_usd: number;
  max_cpu_pct?: number;
}

export interface Positioning {
  nearest_scenario: string;
  similarity_pct: number;
  neighbors: string[];
  distances: Record<string, number>;
}

export interface Predictions {
  energy_total_kwh: number;
  wait_mean_s: number;
  estimated_cost_usd: number;
  cpu_util_mean_pct: number;
  saturation_pct: number;
  completion_rate_pct: number;
}

export type RecommendationStatus = 'ok' | 'attention' | 'critical';
export type RecommendationCategory =
  | 'capacity'
  | 'energy'
  | 'latency'
  | 'cost'
  | 'reliability';

export interface RecommendationItem {
  priority: number;
  category: RecommendationCategory;
  action: string;
  detail: string;
  impact: string;
}

export interface Headroom {
  tasks_until_max_observed: number;
  energy_margin_pct: number | null;
  cost_margin_pct: number | null;
}

export interface RecommendationOutput {
  model_version: string;
  topology: string;
  timestamp: string;
  input_state: DatacenterState;
  sla_config: SLAConfig;
  positioning: Positioning;
  predictions: Predictions;
  status: RecommendationStatus;
  warnings: string[];
  recommendations: RecommendationItem[];
  headroom: Headroom;
}

export interface ClientProfile {
  client_id: string;
  name: string;
  priority: 'availability' | 'cost' | 'performance' | 'energy';
}

export interface CollectorStatus {
  collector_status: string;
  api_reachable: boolean;
  last_collection: string;
  last_recommendation_status: RecommendationStatus;
  collections_total: number;
  client_profile: ClientProfile | null;
}
