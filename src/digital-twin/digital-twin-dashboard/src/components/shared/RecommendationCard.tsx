import { RecommendationItem, RecommendationCategory } from '../../types';
import {
  Server,
  Zap,
  Clock,
  DollarSign,
  Shield,
} from 'lucide-react';

const categoryIcons: Record<RecommendationCategory, React.ReactNode> = {
  capacity: <Server size={14} />,
  energy: <Zap size={14} />,
  latency: <Clock size={14} />,
  cost: <DollarSign size={14} />,
  reliability: <Shield size={14} />,
};

const categoryColors: Record<RecommendationCategory, string> = {
  capacity: 'text-accent-blue border-accent-blue/30 bg-accent-blue/10',
  energy: 'text-accent-warn border-accent-warn/30 bg-accent-warn/10',
  latency: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  cost: 'text-accent-ok border-accent-ok/30 bg-accent-ok/10',
  reliability: 'text-accent-crit border-accent-crit/30 bg-accent-crit/10',
};

interface Props {
  item: RecommendationItem;
}

export function RecommendationCard({ item }: Props) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded border ${
            categoryColors[item.category]
          }`}
        >
          {categoryIcons[item.category]}
          {item.category.toUpperCase()}
        </span>
        <span className="text-xs font-mono text-text-secondary">
          P{item.priority}
        </span>
      </div>
      <p className="text-sm text-text-primary font-medium">{item.action}</p>
      <p className="text-xs text-text-secondary">{item.detail}</p>
      <p className="text-xs text-accent-blue font-mono">→ {item.impact}</p>
    </div>
  );
}
