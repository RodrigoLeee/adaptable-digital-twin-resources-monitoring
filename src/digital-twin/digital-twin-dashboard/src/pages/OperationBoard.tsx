import { useRecommendationStore } from '../store/recommendationStore';
import { MetricCard } from '../components/shared/MetricCard';
import { RecommendationCard } from '../components/shared/RecommendationCard';
import { LatencyChart } from '../components/charts/LatencyChart';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useHistory } from '../hooks/useHistory';
import { Activity, Clock, CheckCircle, Server } from 'lucide-react';

const MAX_TASKS = 350;

function GaugeCircle({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(value / max, 1);
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;
  const color = pct > 0.9 ? '#ef4444' : pct > 0.7 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#1f2937" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          className="transition-all duration-500"
        />
        <text x="70" y="65" textAnchor="middle" fill="#f9fafb" fontSize="20" fontFamily="JetBrains Mono" fontWeight="bold">
          {value}
        </text>
        <text x="70" y="82" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="JetBrains Mono">
          / {max}
        </text>
      </svg>
      <span className="text-xs font-mono text-text-secondary uppercase">{label}</span>
    </div>
  );
}

export default function OperationBoard() {
  const current = useRecommendationStore((s) => s.current);
  const slaConfig = useRecommendationStore((s) => s.slaConfig);
  const history = useHistory();

  if (!current) return <LoadingSpinner />;

  const { predictions, input_state, headroom } = current;
  const opRecs = current.recommendations.filter(
    (r) => r.category === 'capacity' || r.category === 'latency'
  );

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-auto">
      <div>
        <h1 className="font-mono text-xl font-bold text-text-primary">Operation Board</h1>
        <p className="text-text-secondary text-sm">Visão operacional em tempo real — carga, latência e capacidade</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Tasks Ativas"
          value={input_state.n_tasks_active}
          icon={<Activity size={12} />}
          accent={input_state.n_tasks_active / MAX_TASKS > 0.9 ? 'crit' : 'ok'}
          sub={`Headroom: ${headroom.tasks_until_max_observed} tasks`}
        />
        <MetricCard
          label="Wait Time"
          value={predictions.wait_mean_s.toFixed(2)}
          unit="s"
          icon={<Clock size={12} />}
          accent={predictions.wait_mean_s > slaConfig.max_wait_s ? 'crit' : predictions.wait_mean_s > slaConfig.max_wait_s * 0.7 ? 'warn' : 'ok'}
        />
        <MetricCard
          label="Completion Rate"
          value={predictions.completion_rate_pct.toFixed(1)}
          unit="%"
          icon={<CheckCircle size={12} />}
          accent={predictions.completion_rate_pct >= 95 ? 'ok' : 'warn'}
        />
        <MetricCard
          label="Hosts Ativos"
          value={input_state.hosts_active}
          icon={<Server size={12} />}
          accent="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4 flex justify-center">
          <GaugeCircle value={input_state.n_tasks_active} max={MAX_TASKS} label="Tasks / Capacidade" />
        </div>

        <div className="lg:col-span-2 bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
            Wait Time — Histórico
          </h2>
          <LatencyChart history={history} slaMaxWait={slaConfig.max_wait_s} />
        </div>
      </div>

      {opRecs.length > 0 && (
        <div>
          <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider mb-3">
            Recomendações Operacionais
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {opRecs.map((r, i) => (
              <RecommendationCard key={i} item={r} />
            ))}
          </div>
        </div>
      )}

      <div className="bg-bg-surface border border-border rounded-lg p-4">
        <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider mb-3">
          Distâncias por Cenário
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-text-secondary border-b border-border">
                <th className="text-left py-2 pr-4">Cenário</th>
                <th className="text-right py-2">Distância</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(current.positioning.distances)
                .sort(([, a], [, b]) => a - b)
                .map(([sc, d]) => (
                  <tr
                    key={sc}
                    className={`border-b border-border/50 ${
                      sc === current.positioning.nearest_scenario ? 'text-accent-blue' : 'text-text-secondary'
                    }`}
                  >
                    <td className="py-1.5 pr-4">{sc}</td>
                    <td className="text-right py-1.5">{d.toFixed(4)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
