import { useRecommendationStore } from '../store/recommendationStore';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useHistory } from '../hooks/useHistory';
import { ScenarioChip } from '../components/shared/ScenarioChip';
import { ArrowRight } from 'lucide-react';
import { RecommendationStatus } from '../types';

const statusColors: Record<RecommendationStatus, string> = {
  ok: 'text-accent-ok',
  attention: 'text-accent-warn',
  critical: 'text-accent-crit',
};

export default function ChangeAnalysisBoard() {
  const current = useRecommendationStore((s) => s.current);
  const history = useHistory();

  if (!current) return <LoadingSpinner />;

  // Detect scenario transitions
  const transitions = history
    .slice(0, -1)
    .map((r, i) => ({
      from: history[i + 1],
      to: r,
    }))
    .filter((t) => t.from.positioning.nearest_scenario !== t.to.positioning.nearest_scenario)
    .slice(0, 15);

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-auto">
      <div>
        <h1 className="font-mono text-xl font-bold text-text-primary">Change Analysis Board</h1>
        <p className="text-text-secondary text-sm">Transições de cenário e mudanças de estado</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-2">
          <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">Estado Atual</h2>
          <ScenarioChip
            scenario={current.positioning.nearest_scenario}
            similarity={current.positioning.similarity_pct}
            active
          />
          <p className="text-xs text-text-secondary font-mono mt-1">
            Topology: {current.topology}
          </p>
          <p className="text-xs text-text-secondary font-mono">
            Model: {current.model_version}
          </p>
        </div>

        <div className="lg:col-span-2 bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
            Variação das Métricas de Input
          </h2>
          {history.length < 2 ? (
            <p className="text-xs text-text-secondary font-mono">Histórico insuficiente.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {(
                [
                  ['n_tasks_active', 'Tasks Ativas'],
                  ['exec_mean_s', 'Exec Mean (s)'],
                  ['energy_consumed_kwh', 'Energia (kWh)'],
                  ['wait_mean_s', 'Wait Mean (s)'],
                  ['hosts_active', 'Hosts Ativos'],
                ] as const
              ).map(([key, label]) => {
                const cur = current.input_state[key];
                const prev = history[1]?.input_state[key] ?? cur;
                const delta = cur - prev;
                return (
                  <div key={key} className="flex justify-between gap-2 border-b border-border/50 py-1">
                    <span className="text-text-secondary">{label}</span>
                    <span className={delta > 0 ? 'text-accent-warn' : delta < 0 ? 'text-accent-ok' : 'text-text-primary'}>
                      {cur.toFixed(2)}
                      {delta !== 0 && (
                        <span className="text-[10px] ml-1">({delta > 0 ? '+' : ''}{delta.toFixed(2)})</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
        <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
          Transições de Cenário Detectadas
        </h2>
        {transitions.length === 0 ? (
          <p className="text-xs text-text-secondary font-mono">Nenhuma transição de cenário recente.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {transitions.map((t, i) => (
              <li key={i} className="flex items-center gap-3 text-xs font-mono border-b border-border/50 py-2">
                <span className="text-text-secondary shrink-0">
                  {new Date(t.to.timestamp).toLocaleTimeString('pt-BR')}
                </span>
                <ScenarioChip scenario={t.from.positioning.nearest_scenario} />
                <ArrowRight size={12} className="text-text-secondary shrink-0" />
                <ScenarioChip scenario={t.to.positioning.nearest_scenario} active />
                <span className={`ml-auto ${statusColors[t.to.status]}`}>{t.to.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
