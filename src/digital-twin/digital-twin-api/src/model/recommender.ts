import { ModelBundle, DatacenterState, SLAConfig, RecommendationOutput, RecommendationItem } from '../types';
import { scaleInput, predict, knnFind } from './inference';

export function recommend(
  state: DatacenterState,
  sla: SLAConfig,
  bundle: ModelBundle,
): RecommendationOutput {
  const { predictor, positioner, scaler, rules, metadata } = bundle;

  // --- Layer 1: Positioning (KNN) ---
  const rawFeatures = [state.n_tasks_active, state.exec_mean_s, state.sim_duration_h];
  const scaled = scaleInput(rawFeatures, scaler);
  const neighbors = knnFind(scaled, positioner);

  const distNearest = neighbors[0].dist;
  const distMax = neighbors[neighbors.length - 1].dist;
  const similarityPct = distMax > 0
    ? Math.round((1 - distNearest / distMax) * 10000) / 100
    : 100;

  const distancesMap: Record<string, number> = {};
  for (const n of neighbors) {
    distancesMap[n.scenario] = Math.round(n.dist * 10000) / 10000;
  }

  // --- Layer 2: Polynomial Prediction ---
  const predictions = predict(state.n_tasks_active, predictor);

  // Recalculate cost using active hosts (more accurate than regression)
  if (state.hosts_active > 0 && state.sim_duration_h > 0) {
    predictions.estimated_cost_usd = state.hosts_active * state.sim_duration_h * metadata.pricing.price_usd_per_h;
  }

  // Round predictions to reasonable precision
  predictions.energy_total_kwh = Math.round(predictions.energy_total_kwh * 1e8) / 1e8;
  predictions.wait_mean_s = Math.round(predictions.wait_mean_s * 1e8) / 1e8;
  predictions.estimated_cost_usd = Math.round(predictions.estimated_cost_usd * 1e8) / 1e8;
  predictions.cpu_util_mean_pct = Math.round(predictions.cpu_util_mean_pct * 1e8) / 1e8;
  predictions.saturation_pct = Math.round(predictions.saturation_pct * 1e8) / 1e8;
  predictions.completion_rate_pct = Math.round(predictions.completion_rate_pct * 1e4) / 1e4;

  // --- Layer 3: Rule Engine ---
  let status: 'ok' | 'attention' | 'critical' = 'ok';
  const warnings: string[] = [];
  const recs: RecommendationItem[] = [];
  const tpl = rules.action_templates;
  const cap = rules.capacity;
  const thresh = rules.status_thresholds;

  const escalate = (level: 'attention' | 'critical') => {
    if (level === 'critical') status = 'critical';
    else if (status === 'ok') status = 'attention';
  };

  // 1. Capacity
  const tasksRemaining = cap.max_tasks_observed - state.n_tasks_active;
  const capacityPct = state.n_tasks_active / cap.max_tasks_observed;
  if (capacityPct >= 0.9) {
    escalate('critical');
    warnings.push(`Task load (${state.n_tasks_active}) near maximum observed capacity (${cap.max_tasks_observed})`);
    recs.push({
      priority: 1,
      category: 'capacity',
      action: tpl['scale_up'],
      detail: `${state.n_tasks_active} active tasks`,
      impact: `Only ${tasksRemaining} tasks until maximum capacity`,
    });
  } else if (capacityPct >= 0.7) {
    escalate('attention');
    recs.push({
      priority: 1,
      category: 'capacity',
      action: tpl['scale_up'],
      detail: `${state.n_tasks_active} active tasks`,
      impact: `Headroom: ${tasksRemaining} tasks until maximum capacity`,
    });
  } else if (capacityPct < 0.2) {
    recs.push({
      priority: 1,
      category: 'capacity',
      action: tpl['scale_down'],
      detail: `${state.n_tasks_active} active tasks`,
      impact: `Headroom: ${tasksRemaining} tasks until maximum capacity`,
    });
  } else {
    recs.push({
      priority: 1,
      category: 'capacity',
      action: 'Load within normal operational envelope',
      detail: `${state.n_tasks_active} active tasks`,
      impact: `Headroom: ${tasksRemaining} tasks until maximum capacity`,
    });
  }

  // 2. Energy
  const energyMarginPct = sla.max_energy_kwh > 0
    ? Math.round(((sla.max_energy_kwh - predictions.energy_total_kwh) / sla.max_energy_kwh) * 1000) / 10
    : null;

  if (predictions.energy_total_kwh > sla.max_energy_kwh) {
    escalate('attention');
    warnings.push(`Predicted energy (${predictions.energy_total_kwh.toFixed(5)} kWh) exceeds SLA limit (${sla.max_energy_kwh} kWh)`);
    recs.push({
      priority: 2,
      category: 'energy',
      action: tpl['energy_warning'],
      detail: `Predicted: ${predictions.energy_total_kwh.toFixed(5)} kWh | Limit: ${sla.max_energy_kwh} kWh`,
      impact: `Excess: ${(predictions.energy_total_kwh - sla.max_energy_kwh).toFixed(5)} kWh`,
    });
  } else if (predictions.energy_total_kwh > cap.max_energy_kwh_observed * 0.66) {
    recs.push({
      priority: 2,
      category: 'energy',
      action: tpl['energy_warning'],
      detail: `Predicted: ${predictions.energy_total_kwh.toFixed(5)} kWh`,
      impact: energyMarginPct !== null ? `Energy margin: ${energyMarginPct}%` : 'No SLA limit set',
    });
  } else {
    recs.push({
      priority: 2,
      category: 'energy',
      action: tpl['energy_ok'],
      detail: `Predicted: ${predictions.energy_total_kwh.toFixed(5)} kWh`,
      impact: energyMarginPct !== null ? `Energy margin: ${energyMarginPct}%` : 'No SLA limit set',
    });
  }

  // 3. Latency
  const waitVal = predictions.wait_mean_s;
  if (waitVal > thresh.wait_mean_s.critical) {
    escalate('critical');
    warnings.push(`Predicted wait time (${waitVal.toFixed(3)}s) above critical threshold (${thresh.wait_mean_s.critical}s)`);
    recs.push({
      priority: 3,
      category: 'latency',
      action: tpl['latency_high'],
      detail: `Predicted: ${waitVal.toFixed(3)}s -- above critical threshold`,
      impact: `Critical: exceeds ${thresh.wait_mean_s.critical}s`,
    });
  } else if (waitVal > thresh.wait_mean_s.attention || waitVal > sla.max_wait_s) {
    escalate('attention');
    const reason = waitVal > sla.max_wait_s ? `above SLA limit (${sla.max_wait_s}s)` : `above attention threshold`;
    warnings.push(`Predicted wait time (${waitVal.toFixed(3)}s) ${reason}`);
    recs.push({
      priority: 3,
      category: 'latency',
      action: tpl['latency_high'],
      detail: `Predicted: ${waitVal.toFixed(3)}s -- ${reason}`,
      impact: `Review scheduling policy`,
    });
  } else {
    recs.push({
      priority: 3,
      category: 'latency',
      action: tpl['latency_ok'],
      detail: `Predicted: ${waitVal.toFixed(3)}s -- within normal range`,
      impact: 'No action required',
    });
  }

  // 4. Cost
  const costMarginPct = sla.max_cost_usd > 0
    ? Math.round(((sla.max_cost_usd - predictions.estimated_cost_usd) / sla.max_cost_usd) * 1000) / 10
    : null;

  if (predictions.estimated_cost_usd > sla.max_cost_usd) {
    escalate('attention');
    warnings.push(`Predicted cost ($${predictions.estimated_cost_usd.toFixed(4)}) exceeds SLA budget ($${sla.max_cost_usd.toFixed(4)})`);
    recs.push({
      priority: 4,
      category: 'cost',
      action: tpl['cost_over'],
      detail: `Predicted: $${predictions.estimated_cost_usd.toFixed(4)} | Limit: $${sla.max_cost_usd.toFixed(4)}`,
      impact: `Excess: $${(predictions.estimated_cost_usd - sla.max_cost_usd).toFixed(4)}`,
    });
  } else {
    recs.push({
      priority: 4,
      category: 'cost',
      action: tpl['cost_ok'],
      detail: `Predicted: $${predictions.estimated_cost_usd.toFixed(4)}`,
      impact: costMarginPct !== null ? `Cost margin: ${costMarginPct}%` : 'No SLA limit set',
    });
  }

  // 5. CPU utilization vs SLA
  if (sla.max_cpu_pct != null) {
    const cpuVal = predictions.cpu_util_mean_pct;
    const cpuLimit = sla.max_cpu_pct;
    if (cpuVal > cpuLimit) {
      escalate('attention');
      warnings.push(`Predicted CPU utilization (${cpuVal.toFixed(1)}%) exceeds SLA limit (${cpuLimit}%)`);
      recs.push({
        priority: 2,
        category: 'capacity',
        action: 'Reduce workload or scale out — CPU utilization above SLA limit',
        detail: `Predicted: ${cpuVal.toFixed(1)}% | SLA limit: ${cpuLimit}%`,
        impact: `Excess: ${(cpuVal - cpuLimit).toFixed(1)}pp above limit`,
      });
    } else {
      recs.push({
        priority: 2,
        category: 'capacity',
        action: 'CPU utilization within SLA limit',
        detail: `Predicted: ${cpuVal.toFixed(1)}% | SLA limit: ${cpuLimit}%`,
        impact: `Margin: ${(cpuLimit - cpuVal).toFixed(1)}pp`,
      });
    }
  }

  // 6. Reliability
  const compRate = predictions.completion_rate_pct;
  if (compRate < thresh.completion_rate_pct.critical) {
    escalate('critical');
    warnings.push(`Completion rate (${compRate.toFixed(1)}%) below critical threshold (${thresh.completion_rate_pct.critical}%)`);
    recs.push({
      priority: 5,
      category: 'reliability',
      action: tpl['completion_low'],
      detail: `Predicted: ${compRate.toFixed(1)}%`,
      impact: `Critical: below ${thresh.completion_rate_pct.critical}%`,
    });
  } else if (compRate < thresh.completion_rate_pct.attention) {
    escalate('attention');
    recs.push({
      priority: 5,
      category: 'reliability',
      action: tpl['completion_low'],
      detail: `Predicted: ${compRate.toFixed(1)}%`,
      impact: `Below attention threshold (${thresh.completion_rate_pct.attention}%)`,
    });
  } else {
    recs.push({
      priority: 5,
      category: 'reliability',
      action: tpl['completion_ok'],
      detail: `Predicted: ${compRate.toFixed(1)}%`,
      impact: 'No action required',
    });
  }

  return {
    model_version: metadata.model_version,
    topology: metadata.topology,
    timestamp: new Date().toISOString(),
    input_state: state,
    sla_config: sla,
    positioning: {
      nearest_scenario: neighbors[0].scenario,
      similarity_pct: similarityPct,
      neighbors: neighbors.slice(1, 3).map(n => n.scenario),
      distances: distancesMap,
    },
    predictions,
    status,
    warnings,
    recommendations: recs,
    headroom: {
      tasks_until_max_observed: tasksRemaining,
      energy_margin_pct: energyMarginPct,
      cost_margin_pct: costMarginPct !== null ? (costMarginPct < 0 ? 0 : costMarginPct) : null,
    },
  };
}
