import { useState } from 'react';
import { useRecommendationStore } from '../store/recommendationStore';
import { RecommendationCard } from '../components/shared/RecommendationCard';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { StatusBadge } from '../components/layout/StatusBadge';
import { RecommendationCategory } from '../types';

const CATEGORIES: RecommendationCategory[] = ['capacity', 'energy', 'latency', 'cost', 'reliability'];

export default function ReactionBoard() {
  const current = useRecommendationStore((s) => s.current);
  const [filter, setFilter] = useState<RecommendationCategory | 'all'>('all');

  if (!current) return <LoadingSpinner />;

  const sorted = [...current.recommendations].sort((a, b) => a.priority - b.priority);
  const filtered = filter === 'all' ? sorted : sorted.filter((r) => r.category === filter);

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold text-text-primary">Reaction Board</h1>
          <p className="text-text-secondary text-sm">Recomendações de ação por prioridade</p>
        </div>
        <StatusBadge status={current.status} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
            filter === 'all'
              ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/40'
              : 'border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          TODOS ({sorted.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = sorted.filter((r) => r.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
                filter === cat
                  ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/40'
                  : 'border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {cat.toUpperCase()} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-text-secondary font-mono text-sm">
          Nenhuma recomendação para esta categoria.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((item, i) => (
            <RecommendationCard key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
