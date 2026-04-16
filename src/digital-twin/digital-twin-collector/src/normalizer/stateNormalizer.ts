import { DatacenterState } from '../types';

const MS_TO_S = 1_000;
const MS_TO_H = 3_600_000;
const J_TO_KWH = 1 / 3_600_000;

export interface TaskRow {
  task_id: string | number;
  task_name?: string;
  host_name?: string;
  submission_time: number;
  schedule_time: number;
  finish_time: number;
  task_state?: string;
  cpu_count?: number;
  mem_capacity?: number;
}

export interface PowerSourceRow {
  timestamp: number;
  energy_usage: number;
  power_draw?: number;
  carbon_emission?: number;
  carbon_intensity?: number;
}

export interface ServiceRow {
  timestamp: number;
  hosts_up: number;
  hosts_down?: number;
  tasks_total?: number;
  tasks_pending?: number;
  tasks_active?: number;
  tasks_completed: number;
  tasks_terminated?: number;
}

export interface HostRow {
  timestamp: number;
  host_name?: string;
  cpu_utilization: number;
  cpu_usage?: number;
  cpu_demand?: number;
  power_draw?: number;
  energy_usage?: number;
  mem_capacity?: number;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function max(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

export function normalizeFromParquets(
  taskRows: TaskRow[],
  powerRows: PowerSourceRow[],
  serviceRows: ServiceRow[],
  hostRows: HostRow[],
): DatacenterState {
  // task.parquet
  const uniqueTaskIds = [...new Set(taskRows.map(r => String(r.task_id)))];
  const nTasksActive = uniqueTaskIds.length;

  const execTimes = taskRows
    .filter(r => r.finish_time != null && r.schedule_time != null)
    .map(r => (r.finish_time - r.schedule_time) / MS_TO_S);
  const execMeanS = mean(execTimes);

  const simDurationH = max(taskRows.map(r => r.finish_time)) / MS_TO_H;

  const waitTimes = taskRows
    .filter(r => r.schedule_time != null && r.submission_time != null)
    .map(r => Math.max(0, (r.schedule_time - r.submission_time) / MS_TO_S));
  const waitMeanS = mean(waitTimes);

  // powerSource.parquet
  const sortedPower = [...powerRows].sort((a, b) => a.timestamp - b.timestamp);
  const lastPower = sortedPower[sortedPower.length - 1];
  const energyConsumedKwh = lastPower ? lastPower.energy_usage * J_TO_KWH : 0;

  // service.parquet
  const sortedService = [...serviceRows].sort((a, b) => a.timestamp - b.timestamp);
  const lastService = sortedService[sortedService.length - 1];
  const hostsActive = lastService ? lastService.hosts_up : 0;
  const tasksCompleted = lastService ? lastService.tasks_completed : 0;

  // host.parquet (optional enrichment)
  const cpuUtilMean = hostRows.length > 0 ? mean(hostRows.map(r => r.cpu_utilization)) : undefined;

  const state: DatacenterState = {
    n_tasks_active: nTasksActive,
    exec_mean_s: execMeanS,
    sim_duration_h: simDurationH,
    energy_consumed_kwh: energyConsumedKwh,
    wait_mean_s: waitMeanS,
    hosts_active: hostsActive,
    tasks_completed: tasksCompleted,
  };

  if (cpuUtilMean !== undefined) {
    state.cpu_util_mean = cpuUtilMean;
  }

  return state;
}

export function normalizeManualState(raw: DatacenterState): DatacenterState {
  return { ...raw };
}
