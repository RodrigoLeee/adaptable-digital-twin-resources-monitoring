import { useRecommendationStore } from '../../store/recommendationStore';
import { StatusBadge } from './StatusBadge';
import { Wifi, WifiOff } from 'lucide-react';

export function Header() {
  const current = useRecommendationStore((s) => s.current);
  const isConnected = useRecommendationStore((s) => s.isConnected);
  const clientProfile = useRecommendationStore((s) => s.clientProfile);

  const lastUpdate = current?.timestamp
    ? new Date(current.timestamp).toLocaleTimeString('pt-BR')
    : '—';

  return (
    <header className="h-14 bg-bg-surface border-b border-border flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1">
        <span className="font-mono text-sm text-text-secondary">
          {clientProfile?.name ?? 'Digital Twin Dashboard'}
        </span>
        {clientProfile && (
          <span className="ml-2 text-xs text-text-secondary/60 font-mono">
            [{clientProfile.client_id}]
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm">
        {current && <StatusBadge status={current.status} size="sm" />}

        <span className="text-text-secondary font-mono text-xs">
          upd {lastUpdate}
        </span>

        <div
          className={`flex items-center gap-1.5 font-mono text-xs ${
            isConnected ? 'text-accent-ok' : 'text-accent-crit'
          }`}
        >
          {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isConnected ? 'SSE LIVE' : 'DISCONNECTED'}
        </div>
      </div>
    </header>
  );
}
