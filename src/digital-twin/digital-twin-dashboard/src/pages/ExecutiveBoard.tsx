import { useRecommendationStore } from '../store/recommendationStore';
import { StatusBadge } from '../components/layout/StatusBadge';
import { MetricCard } from '../components/shared/MetricCard';
import { ScenarioChip } from '../components/shared/ScenarioChip';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useHistory } from '../hooks/useHistory';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, DollarSign, Zap, CheckCircle, TrendingUp } from 'lucide-react';
import { RecommendationStatus } from '../types';

const statusColor: Record<RecommendationStatus, string> = {
  ok: '#10b981',
  attention: '#f59e0b',
  critical: '#ef4444',
};

const statusValue: Record<RecommendationStatus, number> = {
  ok: 1,
  attention: 2,
  critical: 3,
};

export default function ExecutiveBoard() {
  const current = useRecommendationStore((s) => s.current);
  const history = useHistory();

  if (!current) return <LoadingSpinner />;

  const { predictions, headroom, positioning, warnings } = current;

  const statusHistory = [...history]
    .reverse()
    .slice(-20)
    .map((r) => ({
      t: new Date(r.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: statusValue[r.status],
      color: statusColor[r.status],
    }));

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold text-text-primary">Executive Board</h1>
          <p className="text-text-secondary text-sm">Visão C-Level — custo, risco e continuidade</p>
        </div>
        <StatusBadge status={current.status} size="lg" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Custo Estimado"
          value={predictions.estimated_cost_usd.toFixed(2)}
          unit="USD"
          icon={<DollarSign size={12} />}
          accent="ok"
        />
        <MetricCard
          label="Energia Total"
          value={predictions.energy_total_kwh.toFixed(1)}
          unit="kWh"
          icon={<Zap size={12} />}
          accent="warn"
        />
        <MetricCard
          label="Completion Rate"
          value={predictions.completion_rate_pct.toFixed(1)}
          unit="%"
          icon={<CheckCircle size={12} />}
          accent={predictions.completion_rate_pct >= 95 ? 'ok' : predictions.completion_rate_pct >= 80 ? 'warn' : 'crit'}
        />
        <MetricCard
          label="Headroom"
          value={headroom.tasks_until_max_observed}
          unit="tasks"
          icon={<TrendingUp size={12} />}
          sub={
            headroom.energy_margin_pct != null
              ? `Energy margin: ${headroom.energy_margin_pct.toFixed(1)}%`
              : undefined
          }
          accent={headroom.tasks_until_max_observed > 50 ? 'ok' : 'warn'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
            Cenário Posicionado
          </h2>
          <ScenarioChip
            scenario={positioning.nearest_scenario}
            similarity={positioning.similarity_pct}
            active
          />
          <div className="flex flex-wrap gap-1.5 mt-1">
            {positioning.neighbors.map((n) => (
              <ScenarioChip key={n} scenario={n} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
            Histórico de Status
          </h2>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={statusHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="t" tick={{ fill: '#9ca3af', fontSize: 9, fontFamily: 'JetBrains Mono' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 3]} ticks={[1, 2, 3]} tickFormatter={(v) => ['', 'OK', 'ATT', 'CRIT'][v]} tick={{ fill: '#9ca3af', fontSize: 9 }} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 11 }}
                formatter={(v: number) => [['', 'ok', 'attention', 'critical'][v], 'status']}
              />
              <Area type="stepAfter" dataKey="value" stroke="#3b82f6" fill="#3b82f680" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="bg-accent-warn/10 border border-accent-warn/30 rounded-lg p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-accent-warn font-mono text-sm font-bold">
            <AlertTriangle size={14} />
            Warnings Ativos ({warnings.length})
          </div>
          <ul className="flex flex-col gap-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-accent-warn/80 font-mono">
                • {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
