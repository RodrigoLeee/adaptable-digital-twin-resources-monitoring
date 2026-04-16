import { useRecommendationStore } from '../store/recommendationStore';
import { MetricCard } from '../components/shared/MetricCard';
import { LatencyChart } from '../components/charts/LatencyChart';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useHistory } from '../hooks/useHistory';
import { Clock, CheckCircle, Cpu, Activity } from 'lucide-react';

function GaugeBar({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-text-secondary">{label}</span>
        <span style={{ color }}>{value.toFixed(2)} / {max}</span>
      </div>
      <div className="h-3 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono text-right" style={{ color }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

export default function QoSBoard() {
  const current = useRecommendationStore((s) => s.current);
  const slaConfig = useRecommendationStore((s) => s.slaConfig);
  const history = useHistory();

  if (!current) return <LoadingSpinner />;

  const { predictions } = current;

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-auto">
      <div>
        <h1 className="font-mono text-xl font-bold text-text-primary">QoS Board</h1>
        <p className="text-text-secondary text-sm">Qualidade de serviço agregada</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Wait Mean"
          value={predictions.wait_mean_s.toFixed(2)}
          unit="s"
          icon={<Clock size={12} />}
          accent={predictions.wait_mean_s > slaConfig.max_wait_s ? 'crit' : 'ok'}
        />
        <MetricCard
          label="Completion Rate"
          value={predictions.completion_rate_pct.toFixed(1)}
          unit="%"
          icon={<CheckCircle size={12} />}
          accent={predictions.completion_rate_pct >= 95 ? 'ok' : predictions.completion_rate_pct >= 80 ? 'warn' : 'crit'}
        />
        <MetricCard
          label="Saturation"
          value={predictions.saturation_pct.toFixed(1)}
          unit="%"
          icon={<Activity size={12} />}
          accent={predictions.saturation_pct > 80 ? 'crit' : predictions.saturation_pct > 60 ? 'warn' : 'ok'}
        />
        <MetricCard
          label="CPU Utilization"
          value={predictions.cpu_util_mean_pct.toFixed(1)}
          unit="%"
          icon={<Cpu size={12} />}
          accent={predictions.cpu_util_mean_pct > 85 ? 'crit' : 'blue'}
        />
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-5">
        <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
          Gauges de SLA
        </h2>
        <GaugeBar
          value={predictions.wait_mean_s}
          max={slaConfig.max_wait_s}
          label="Wait Mean vs SLA Max"
          color={predictions.wait_mean_s > slaConfig.max_wait_s ? '#ef4444' : '#3b82f6'}
        />
        <GaugeBar
          value={100 - predictions.completion_rate_pct}
          max={100}
          label="Incompletion Rate (menor = melhor)"
          color={predictions.completion_rate_pct < 80 ? '#ef4444' : '#10b981'}
        />
        <GaugeBar
          value={predictions.saturation_pct}
          max={100}
          label="Saturation"
          color={predictions.saturation_pct > 80 ? '#ef4444' : predictions.saturation_pct > 60 ? '#f59e0b' : '#10b981'}
        />
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
        <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
          Wait Mean — Histórico
        </h2>
        <LatencyChart history={history} slaMaxWait={slaConfig.max_wait_s} />
      </div>
    </div>
  );
}
