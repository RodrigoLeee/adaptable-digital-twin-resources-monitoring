import { useRecommendationStore } from '../store/recommendationStore';
import { ScenarioChip } from '../components/shared/ScenarioChip';
import { RadarChart } from '../components/charts/RadarChart';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useHistory } from '../hooks/useHistory';
import { Shield, AlertTriangle } from 'lucide-react';

export default function CybersecBoard() {
  const current = useRecommendationStore((s) => s.current);
  const history = useHistory();

  if (!current) return <LoadingSpinner />;

  const { positioning, warnings, predictions } = current;

  const radarData = Object.entries(positioning.distances).map(([sc, d]) => ({
    metric: sc,
    value: Math.max(0, 1 - d),
  }));

  const criticalHistory = history.filter((r) => r.status === 'critical').slice(0, 10);

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-auto">
      <div className="flex items-center gap-3">
        <Shield size={20} className="text-accent-crit" />
        <div>
          <h1 className="font-mono text-xl font-bold text-text-primary">Cybersec Board</h1>
          <p className="text-text-secondary text-sm">Governança, risco e mudanças de estado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={13} /> Warnings Ativos
          </h2>
          {warnings.length === 0 ? (
            <p className="text-xs text-accent-ok font-mono">Nenhum warning ativo.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {warnings.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-accent-warn font-mono bg-accent-warn/10 border border-accent-warn/20 rounded px-3 py-2"
                >
                  <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
            Zona de Risco — Cenários Vizinhos
          </h2>
          <p className="text-xs text-text-secondary">
            Cenários próximos ao estado atual representam possíveis transições de risco.
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            <ScenarioChip
              scenario={positioning.nearest_scenario}
              similarity={positioning.similarity_pct}
              active
            />
            {positioning.neighbors.map((n) => (
              <ScenarioChip key={n} scenario={n} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
            Radar de Proximidade aos Cenários
          </h2>
          <RadarChart data={radarData} />
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
            Histórico de Status Crítico
          </h2>
          {criticalHistory.length === 0 ? (
            <p className="text-xs text-accent-ok font-mono">Nenhum evento crítico recente.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {criticalHistory.map((r, i) => (
                <li
                  key={i}
                  className="text-xs font-mono bg-accent-crit/10 border border-accent-crit/20 rounded px-3 py-2 flex justify-between"
                >
                  <span className="text-accent-crit">CRITICAL</span>
                  <span className="text-text-secondary">
                    {new Date(r.timestamp).toLocaleString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-4">
        <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider mb-3">
          Estado de Saturation e CPU
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm font-mono">
          <div>
            <span className="text-text-secondary">Saturation:</span>{' '}
            <span className={predictions.saturation_pct > 80 ? 'text-accent-crit' : predictions.saturation_pct > 60 ? 'text-accent-warn' : 'text-accent-ok'}>
              {predictions.saturation_pct.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-text-secondary">CPU Mean:</span>{' '}
            <span className={predictions.cpu_util_mean_pct > 85 ? 'text-accent-crit' : 'text-text-primary'}>
              {predictions.cpu_util_mean_pct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
