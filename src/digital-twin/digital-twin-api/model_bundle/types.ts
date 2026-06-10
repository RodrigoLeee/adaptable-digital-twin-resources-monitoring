
// -- Types gerados automaticamente pelo notebook de treino --
// Arquivo: model_bundle/  (carregue os JSONs diretamente)

interface ScalerParams {
  feature_cols: string[];
  mean_: number[];
  scale_: number[];
  var_: number[];
  n_samples: number;
}

interface PredictorTarget {
  coefficients: number[];   // coeficientes do polinômio (grau 1 ou 2)
  degree: number;
  input_feature: string;    // sempre 'n_unique_tasks'
  mae_loo: number;
  r2_train: number;
  y_range: [number, number];
  x_range: [number, number];
}

interface Predictor {
  energy_total_kwh:    PredictorTarget;
  wait_mean_s:         PredictorTarget;
  estimated_cost_usd:  PredictorTarget;
  cpu_util_mean_pct:   PredictorTarget;
  saturation_pct:      PredictorTarget;
  completion_rate_pct: PredictorTarget;
}

interface RecommendationOutput {
  model_version: string;
  topology: string;
  timestamp: string;
  input_state: Record<string, number | string>;
  sla_config: Record<string, number>;
  positioning: {
    nearest_scenario: string;
    similarity_pct: number;
    neighbors: string[];
    distances: Record<string, number>;
  };
  predictions: {
    energy_total_kwh: number;
    wait_mean_s: number;
    estimated_cost_usd: number;
    cpu_util_mean_pct: number;
    saturation_pct: number;
    completion_rate_pct: number;
  };
  status: 'ok' | 'attention' | 'critical';
  warnings: string[];
  recommendations: Array<{
    priority: number;
    category: 'capacity' | 'energy' | 'latency' | 'cost' | 'reliability';
    action: string;
    detail: string;
    impact: string;
  }>;
  headroom: {
    tasks_until_max_observed: number;
    energy_margin_pct: number | null;
    cost_margin_pct: number | null;
  };
}

// -- Funções de inferência em TypeScript puro ------------------
// Sem Python, sem sklearn — só Math

function scaleInput(raw: number[], scaler: ScalerParams): number[] {
  return raw.map((v, i) => (v - scaler.mean_[i]) / scaler.scale_[i]);
}

function polyval(coeffs: number[], x: number): number {
  // Equivalente ao np.polyval do Python
  return coeffs.reduce((acc, c) => acc * x + c, 0);
}

function predict(nTasks: number, predictor: Predictor) {
  const results: Record<string, number> = {};
  for (const [target, info] of Object.entries(predictor)) {
    let val = polyval(info.coefficients, nTasks);
    val = Math.max(info.y_range[0] * 0.5, Math.min(info.y_range[1] * 2.0, val));
    results[target] = val;
  }
  return results;
}
