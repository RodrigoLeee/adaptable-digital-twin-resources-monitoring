import { useState } from 'react';
import { useRecommendationStore } from '../store/recommendationStore';
import { useHistory } from '../hooks/useHistory';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Bell, AlertTriangle, Info } from 'lucide-react';
import { RecommendationStatus } from '../types';

interface AlertEntry {
  timestamp: string;
  message: string;
  status: RecommendationStatus;
}

const statusIcon: Record<RecommendationStatus, React.ReactNode> = {
  ok: <Info size={12} />,
  attention: <AlertTriangle size={12} />,
  critical: <AlertTriangle size={12} />,
};

const statusClass: Record<RecommendationStatus, string> = {
  ok: 'text-accent-ok border-accent-ok/30 bg-accent-ok/10',
  attention: 'text-accent-warn border-accent-warn/30 bg-accent-warn/10',
  critical: 'text-accent-crit border-accent-crit/30 bg-accent-crit/10',
};

export default function AlertsBoard() {
  const current = useRecommendationStore((s) => s.current);
  const history = useHistory();
  const [filterStatus, setFilterStatus] = useState<RecommendationStatus | 'all'>('all');

  if (!current) return <LoadingSpinner />;

  const allAlerts: AlertEntry[] = history.flatMap((r) =>
    r.warnings.map((w) => ({ timestamp: r.timestamp, message: w, status: r.status }))
  );

  const filtered =
    filterStatus === 'all' ? allAlerts : allAlerts.filter((a) => a.status === filterStatus);

  const counts: Record<RecommendationStatus, number> = {
    ok: allAlerts.filter((a) => a.status === 'ok').length,
    attention: allAlerts.filter((a) => a.status === 'attention').length,
    critical: allAlerts.filter((a) => a.status === 'critical').length,
  };

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-auto">
      <div className="flex items-center gap-3">
        <Bell size={20} className="text-accent-warn" />
        <div>
          <h1 className="font-mono text-xl font-bold text-text-primary">Alerts Board</h1>
          <p className="text-text-secondary text-sm">Feed de alertas em tempo real</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-accent-ok/10 border border-accent-ok/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-accent-ok">{counts.ok}</div>
          <div className="text-xs font-mono text-accent-ok/70 uppercase">Ok</div>
        </div>
        <div className="bg-accent-warn/10 border border-accent-warn/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-accent-warn">{counts.attention}</div>
          <div className="text-xs font-mono text-accent-warn/70 uppercase">Attention</div>
        </div>
        <div className="bg-accent-crit/10 border border-accent-crit/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-accent-crit">{counts.critical}</div>
          <div className="text-xs font-mono text-accent-crit/70 uppercase">Critical</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'ok', 'attention', 'critical'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
              filterStatus === s
                ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/40'
                : 'border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {current.warnings.length > 0 && (
          <div className="bg-bg-surface border border-border rounded-lg p-3">
            <h3 className="font-mono text-xs text-text-secondary uppercase mb-2">Warnings Atuais</h3>
            {current.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs font-mono text-accent-warn py-1 border-b border-border/50 last:border-0">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                {w}
              </div>
            ))}
          </div>
        )}

        <div className="bg-bg-surface border border-border rounded-lg p-3 flex flex-col gap-1">
          <h3 className="font-mono text-xs text-text-secondary uppercase mb-2">
            Histórico de Alertas ({filtered.length})
          </h3>
          {filtered.length === 0 ? (
            <p className="text-xs text-text-secondary font-mono">Nenhum alerta no histórico.</p>
          ) : (
            filtered.slice(0, 50).map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-xs font-mono px-2 py-1.5 rounded border ${statusClass[a.status]}`}
              >
                {statusIcon[a.status]}
                <span className="text-text-secondary shrink-0">
                  {new Date(a.timestamp).toLocaleTimeString('pt-BR')}
                </span>
                <span className="flex-1">{a.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
