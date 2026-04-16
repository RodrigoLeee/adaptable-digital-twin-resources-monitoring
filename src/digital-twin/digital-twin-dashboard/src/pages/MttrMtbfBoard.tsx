import { useRecommendationStore } from '../store/recommendationStore';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useHistory } from '../hooks/useHistory';
import { MetricCard } from '../components/shared/MetricCard';
import { Clock, CheckCircle } from 'lucide-react';
import { RecommendationStatus } from '../types';

interface Episode {
  status: RecommendationStatus;
  start: string;
  end: string;
  durationMs: number;
}

function computeEpisodes(history: ReturnType<typeof useHistory>): Episode[] {
  if (history.length < 2) return [];
  const sorted = [...history].reverse();
  const episodes: Episode[] = [];
  let episodeStart = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].status !== episodeStart.status) {
      episodes.push({
        status: episodeStart.status,
        start: episodeStart.timestamp,
        end: sorted[i - 1].timestamp,
        durationMs:
          new Date(sorted[i - 1].timestamp).getTime() -
          new Date(episodeStart.timestamp).getTime(),
      });
      episodeStart = sorted[i];
    }
  }
  return episodes;
}

function formatDuration(ms: number) {
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

const statusColors: Record<RecommendationStatus, string> = {
  ok: 'text-accent-ok',
  attention: 'text-accent-warn',
  critical: 'text-accent-crit',
};

const statusBg: Record<RecommendationStatus, string> = {
  ok: 'bg-accent-ok/10 border-accent-ok/30',
  attention: 'bg-accent-warn/10 border-accent-warn/30',
  critical: 'bg-accent-crit/10 border-accent-crit/30',
};

export default function MttrMtbfBoard() {
  const current = useRecommendationStore((s) => s.current);
  const history = useHistory();

  if (!current) return <LoadingSpinner />;

  const episodes = computeEpisodes(history);

  const okEpisodes = episodes.filter((e) => e.status === 'ok');
  const badEpisodes = episodes.filter((e) => e.status !== 'ok');

  const mtbf =
    okEpisodes.length > 0
      ? okEpisodes.reduce((s, e) => s + e.durationMs, 0) / okEpisodes.length
      : null;

  const mttr =
    badEpisodes.length > 0
      ? badEpisodes.reduce((s, e) => s + e.durationMs, 0) / badEpisodes.length
      : null;

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-auto">
      <div>
        <h1 className="font-mono text-xl font-bold text-text-primary">MTTR / MTBF Board</h1>
        <p className="text-text-secondary text-sm">Indicadores de confiabilidade calculados do histórico</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="MTBF (proxy)"
          value={mtbf != null ? formatDuration(mtbf) : 'N/A'}
          sub="Tempo médio entre falhas"
          icon={<CheckCircle size={12} />}
          accent={mtbf != null ? 'ok' : 'default'}
        />
        <MetricCard
          label="MTTR (proxy)"
          value={mttr != null ? formatDuration(mttr) : 'N/A'}
          sub="Tempo médio para recuperar"
          icon={<Clock size={12} />}
          accent={mttr != null ? 'warn' : 'default'}
        />
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
        <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
          Histórico de Transições
        </h2>
        {episodes.length === 0 ? (
          <p className="text-xs text-text-secondary font-mono">
            Histórico insuficiente para calcular transições.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {episodes.slice(0, 20).map((ep, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 text-xs font-mono px-3 py-2 rounded border ${statusBg[ep.status]}`}
              >
                <span className={`font-bold ${statusColors[ep.status]} w-16 shrink-0`}>
                  {ep.status.toUpperCase()}
                </span>
                <span className="text-text-secondary">
                  {new Date(ep.start).toLocaleTimeString('pt-BR')}
                </span>
                <span className="text-text-secondary">→</span>
                <span className="text-text-secondary">
                  {new Date(ep.end).toLocaleTimeString('pt-BR')}
                </span>
                <span className="ml-auto text-text-primary">{formatDuration(ep.durationMs)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
        <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
          Episódios Críticos
        </h2>
        {badEpisodes.length === 0 ? (
          <p className="text-xs text-accent-ok font-mono">Nenhum episódio crítico registrado.</p>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-text-secondary border-b border-border">
                <th className="text-left py-2 pr-4">Status</th>
                <th className="text-left py-2 pr-4">Início</th>
                <th className="text-left py-2 pr-4">Fim</th>
                <th className="text-right py-2">Duração</th>
              </tr>
            </thead>
            <tbody>
              {badEpisodes.map((ep, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className={`py-1.5 pr-4 ${statusColors[ep.status]}`}>{ep.status}</td>
                  <td className="py-1.5 pr-4 text-text-secondary">
                    {new Date(ep.start).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="py-1.5 pr-4 text-text-secondary">
                    {new Date(ep.end).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="py-1.5 text-right text-text-primary">
                    {formatDuration(ep.durationMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
