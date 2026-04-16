import { useHistory } from '../hooks/useHistory';
import { useRecommendationStore } from '../store/recommendationStore';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { RecommendationCategory, RecommendationStatus } from '../types';
import { AlertTriangle } from 'lucide-react';

const CATEGORIES: RecommendationCategory[] = ['capacity', 'energy', 'latency', 'cost', 'reliability'];

const catColors: Record<RecommendationCategory, string> = {
  capacity: '#3b82f6',
  energy: '#f59e0b',
  latency: '#a855f7',
  cost: '#10b981',
  reliability: '#ef4444',
};

const statusBg: Record<RecommendationStatus, string> = {
  ok: 'border-accent-ok/40 bg-accent-ok/5',
  attention: 'border-accent-warn/40 bg-accent-warn/5',
  critical: 'border-accent-crit/40 bg-accent-crit/5',
};

export default function IncidentsMap() {
  const current = useRecommendationStore((s) => s.current);
  const history = useHistory();

  if (!current) return <LoadingSpinner />;

  // Group consecutive critical/attention into episodes
  const sorted = [...history].reverse();
  const incidents = sorted.filter((r) => r.status !== 'ok');

  // Category warning timeline: count warnings per category across history
  const timeline = CATEGORIES.map((cat) => ({
    cat,
    count: history.flatMap((r) =>
      r.recommendations.filter((rec) => rec.category === cat)
    ).length,
  }));

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-auto">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} className="text-accent-crit" />
        <div>
          <h1 className="font-mono text-xl font-bold text-text-primary">Incidents Map</h1>
          <p className="text-text-secondary text-sm">Mapa de incidentes e relações causais</p>
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
        <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
          Frequência por Categoria
        </h2>
        <div className="flex flex-col gap-3">
          {timeline.map(({ cat, count }) => {
            const maxCount = Math.max(...timeline.map((t) => t.count), 1);
            const pct = (count / maxCount) * 100;
            return (
              <div key={cat} className="flex items-center gap-3">
                <span
                  className="w-20 text-xs font-mono uppercase shrink-0"
                  style={{ color: catColors[cat] }}
                >
                  {cat}
                </span>
                <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: catColors[cat] }}
                  />
                </div>
                <span className="text-xs font-mono text-text-secondary w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
        <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
          Linha do Tempo de Incidentes ({incidents.length})
        </h2>
        {incidents.length === 0 ? (
          <p className="text-xs text-accent-ok font-mono">Nenhum incidente registrado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {incidents.slice(0, 20).map((r, i) => (
              <div
                key={i}
                className={`border rounded-lg p-3 text-xs font-mono flex flex-col gap-2 ${statusBg[r.status]}`}
              >
                <div className="flex justify-between items-center">
                  <span className={r.status === 'critical' ? 'text-accent-crit font-bold' : 'text-accent-warn font-bold'}>
                    {r.status.toUpperCase()}
                  </span>
                  <span className="text-text-secondary">
                    {new Date(r.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex gap-4 text-text-secondary">
                  <span>Tasks: {r.input_state.n_tasks_active}</span>
                  <span>Wait: {r.predictions.wait_mean_s.toFixed(2)}s</span>
                  <span>Scenario: {r.positioning.nearest_scenario}</span>
                </div>
                {r.warnings.length > 0 && (
                  <ul className="flex flex-col gap-0.5">
                    {r.warnings.map((w, j) => (
                      <li key={j} className="text-accent-warn/80">• {w}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
