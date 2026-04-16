import { RecommendationStatus } from '../../types';

interface Props {
  status: RecommendationStatus;
  size?: 'sm' | 'md' | 'lg';
}

const labels: Record<RecommendationStatus, string> = {
  ok: 'OK',
  attention: 'ATTENTION',
  critical: 'CRITICAL',
};

const colors: Record<RecommendationStatus, string> = {
  ok: 'bg-accent-ok/20 text-accent-ok border border-accent-ok/40',
  attention: 'bg-accent-warn/20 text-accent-warn border border-accent-warn/40',
  critical: 'bg-accent-crit/20 text-accent-crit border border-accent-crit/40',
};

const sizes = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-2',
};

export function StatusBadge({ status, size = 'md' }: Props) {
  return (
    <span
      className={`font-mono font-bold rounded ${colors[status]} ${sizes[size]} inline-flex items-center gap-1.5`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          status === 'ok'
            ? 'bg-accent-ok'
            : status === 'attention'
            ? 'bg-accent-warn'
            : 'bg-accent-crit'
        } animate-pulse`}
      />
      {labels[status]}
    </span>
  );
}
