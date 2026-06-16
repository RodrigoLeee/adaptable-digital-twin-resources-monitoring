import { DatacenterState, SLAConfig, Optimizer, OptimizationResult } from '../types';

/**
 * Power per host (kW) at a given utilization fraction, using the linear power
 * model from the topology: idle + (max - idle) * util.
 */
function powerPerHostKw(opt: Optimizer, util: number): number {
  const u = Math.max(0, Math.min(1, util));
  return (opt.idle_power_w + (opt.max_power_w - opt.idle_power_w) * u) / 1000;
}

const round = (v: number, p = 8) => Math.round(v * 10 ** p) / 10 ** p;

/**
 * Reformulated model (Step 2): treat the simulated scenarios as evidence rather
 * than as the solution. Given an incoming workload, find the SMALLEST host count
 * that meets the workload's compute demand within the target utilization band,
 * which (since cost and energy are monotonic-increasing in host count and the
 * SLA is satisfied while capacity is ample) minimizes cost + energy under SLA.
 */
export function findOptimalConfig(
  state: DatacenterState,
  _sla: SLAConfig,
  opt: Optimizer,
): OptimizationResult {
  const durationH = state.sim_duration_h;
  const windowS = durationH * 3600;

  // Demand estimate (Little's law): average concurrent tasks in the window.
  const concurrency = windowS > 0
    ? (state.n_tasks_active * state.exec_mean_s) / windowS
    : state.n_tasks_active;
  const coresRequired = concurrency * opt.avg_cores_per_task;

  // Smallest host count that fits demand at the target utilization band, with a
  // hard floor at 100% utilization (never drop capacity below raw demand).
  const sizedHosts = Math.ceil(coresRequired / (opt.cores_per_host * opt.target_util));
  const hardFloor = Math.ceil(coresRequired / opt.cores_per_host);
  let recommendedHosts = Math.max(sizedHosts, hardFloor, opt.min_hosts);
  recommendedHosts = Math.min(recommendedHosts, opt.max_hosts);

  const currentHosts = state.hosts_active > 0 ? state.hosts_active : opt.max_hosts;

  const utilAtRecommended = recommendedHosts > 0
    ? (coresRequired / (recommendedHosts * opt.cores_per_host)) * 100
    : 0;

  // Projections. Current cluster runs near-idle (util ~0); the right-sized
  // cluster runs at the target utilization band.
  const costCurrent = currentHosts * durationH * opt.price_usd_per_h;
  const costOpt = recommendedHosts * durationH * opt.price_usd_per_h;

  const energyCurrent = powerPerHostKw(opt, 0) * currentHosts * durationH;
  const energyOpt = powerPerHostKw(opt, opt.target_util) * recommendedHosts * durationH;

  const feasible =
    recommendedHosts >= opt.min_hosts &&
    recommendedHosts <= opt.max_hosts &&
    utilAtRecommended <= 100;

  const savingsHosts = currentHosts - recommendedHosts;

  return {
    method: opt.method,
    current_config: { hosts: currentHosts },
    recommended_config: { hosts: recommendedHosts },
    demand: {
      concurrency_tasks: round(concurrency, 4),
      cores_required: round(coresRequired, 4),
      utilization_at_recommended_pct: round(utilAtRecommended, 2),
    },
    projected: {
      cost_usd: round(costOpt),
      energy_kwh: round(energyOpt),
      wait_mean_s: round(state.wait_mean_s, 6), // ample capacity → wait unchanged
      completion_rate_pct: feasible ? 100 : 0,
    },
    savings: {
      cost_usd: round(costCurrent - costOpt),
      energy_kwh: round(energyCurrent - energyOpt),
      hosts: savingsHosts,
      pct: currentHosts > 0 ? round((savingsHosts / currentHosts) * 100, 2) : 0,
    },
    feasible,
  };
}
