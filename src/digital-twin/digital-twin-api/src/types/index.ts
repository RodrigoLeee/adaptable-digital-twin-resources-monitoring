export interface ScalerParams {
  feature_cols: string[];
  mean_: number[];
  scale_: number[];
  var_: number[];
  n_samples: number;
}

export interface PredictorTarget {
  coefficients: number[];
  degree: number;
  input_feature: string;
  mae_loo: number;
  r2_train: number;
  y_range: [number, number];
  x_range: [number, number];
}

export interface Predictor {
  energy_total_kwh: PredictorTarget;
  wait_mean_s: PredictorTarget;
  estimated_cost_usd: PredictorTarget;
  cpu_util_mean_pct: PredictorTarget;
  saturation_pct: PredictorTarget;
  completion_rate_pct: PredictorTarget;
}

export interface Positioner {
  n_neighbors: number;
  metric: string;
  feature_cols: string[];
  scenarios: string[];
  X_scaled: number[][];
  X_raw: number[][];
}

export interface RulesThreshold {
  ok: number;
  attention: number;
  critical: number;
  unit: string;
  direction?: string;
}

export interface Rules {
  description: string;
  topology: string;
  status_thresholds: {
    cpu_util_pct: RulesThreshold;
    wait_mean_s: RulesThreshold;
    saturation_pct: RulesThreshold;
    completion_rate_pct: RulesThreshold;
  };
  capacity: {
    max_tasks_observed: number;
    max_energy_kwh_observed: number;
    max_cost_usd_observed: number;
    n_hosts: number;
  };
  action_templates: Record<string, string>;
}

export interface ScenarioRecord {
  scenario: string;
  n_tasks: number;
  sim_duration_h: number;
  n_hosts: number;
  energy_total_kwh: number;
  power_mean_w: number;
  cpu_util_mean_pct: number;
  wait_mean_s: number;
  wait_p95_s: number;
  exec_mean_s: number;
  estimated_cost_usd: number;
  saturation_pct: number;
  completion_rate_pct: number;
  tasks_per_kwh: number;
  cost_per_task_usd: number;
}

export interface Optimizer {
  method: string;
  description: string;
  topology: string;
  cores_per_host: number;
  n_hosts_topology: number;
  max_hosts: number;
  min_hosts: number;
  idle_power_w: number;
  max_power_w: number;
  power_per_host_idle_kw: number;
  power_per_host_idle_kw_derived: number;
  price_usd_per_h: number;
  avg_cores_per_task: number;
  target_util: number;
  sla_defaults: {
    min_completion_rate_pct: number;
    max_wait_s: number;
    max_saturation_pct: number;
  };
  demand_model: string;
  notes: string;
}

export interface ModelMetadata {
  model_version: string;
  topology: string;
  trained_on: string;
  n_scenarios: number;
  feature_cols: string[];
  target_cols: string[];
  primary_predictor: string;
  positioning_method: string;
  validation: {
    method: string;
    results: Array<{
      target: string;
      degree: number;
      mae_loo: number;
      r2: number;
    }>;
  };
  pricing: {
    price_usd_per_h: number;
    instance_type: string;
    pricing_model: string;
    citation: string;
    bibtex: string;
    source: string;
    note: string;
  };
  artifact_format: string;
  compatible_runtimes: string[];
  notes: string;
}

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

export interface Predictions {
  energy_total_kwh: number;
  wait_mean_s: number;
  estimated_cost_usd: number;
  cpu_util_mean_pct: number;
  saturation_pct: number;
  completion_rate_pct: number;
}

export interface RecommendationItem {
  priority: number;
  category: 'capacity' | 'energy' | 'latency' | 'cost' | 'reliability';
  action: string;
  detail: string;
  impact: string;
}

export interface OptimizationResult {
  method: string;
  current_config: { hosts: number };
  recommended_config: { hosts: number };
  demand: {
    concurrency_tasks: number;
    cores_required: number;
    utilization_at_recommended_pct: number;
  };
  projected: {
    cost_usd: number;
    energy_kwh: number;
    wait_mean_s: number;
    completion_rate_pct: number;
  };
  savings: {
    cost_usd: number;
    energy_kwh: number;
    hosts: number;
    pct: number;
  };
  feasible: boolean;
}

export interface RecommendationOutput {
  model_version: string;
  topology: string;
  timestamp: string;
  input_state: DatacenterState;
  sla_config: SLAConfig;
  positioning: {
    nearest_scenario: string;
    similarity_pct: number;
    neighbors: string[];
    distances: Record<string, number>;
  };
  predictions: Predictions;
  optimization: OptimizationResult;
  status: 'ok' | 'attention' | 'critical';
  warnings: string[];
  recommendations: RecommendationItem[];
  headroom: {
    tasks_until_max_observed: number;
    energy_margin_pct: number | null;
    cost_margin_pct: number | null;
  };
}

export interface ModelBundle {
  predictor: Predictor;
  positioner: Positioner;
  scaler: ScalerParams;
  scenarioDb: ScenarioRecord[];
  rules: Rules;
  optimizer: Optimizer;
  metadata: ModelMetadata;
}
