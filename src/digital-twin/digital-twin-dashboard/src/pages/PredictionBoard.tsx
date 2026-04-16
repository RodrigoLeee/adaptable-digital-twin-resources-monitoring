import { useRecommendationStore } from '../store/recommendationStore';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { TrendingUp, Zap, Clock, DollarSign, Cpu, Activity } from 'lucide-react';
import { ReactNode } from 'react';

interface PredictionItem {
  key: string;
  label: string;
  value: number;
  unit: string;
  icon: ReactNode;
  accent: string;
  goodDir: 'low' | 'high';
}

export default function PredictionBoard() {
  const current = useRecommendationStore((s) => s.current);

  if (!current) return <LoadingSpinner />;

  const { predictions } = current;

  const items: PredictionItem[] = [
    {
      key: 'energy_total_kwh',
      label: 'Energia Total',
      value: predictions.energy_total_kwh,
      unit: 'kWh',
      icon: <Zap size={16} />,
      accent: 'text-accent-warn',
      goodDir: 'low',
    },
    {
      key: 'wait_mean_s',
      label: 'Wait Mean',
      value: predictions.wait_mean_s,
      unit: 's',
      icon: <Clock size={16} />,
      accent: 'text-accent-blue',
      goodDir: 'low',
    },
    {
      key: 'estimated_cost_usd',
      label: 'Custo Estimado',
      value: predictions.estimated_cost_usd,
      unit: 'USD',
      icon: <DollarSign size={16} />,
      accent: 'text-accent-ok',
      goodDir: 'low',
    },
    {
      key: 'cpu_util_mean_pct',
      label: 'CPU Utilization',
      value: predictions.cpu_util_mean_pct,
      unit: '%',
      icon: <Cpu size={16} />,
      accent: 'text-purple-400',
      goodDir: 'low',
    },
    {
      key: 'saturation_pct',
      label: 'Saturation',
      value: predictions.saturation_pct,
      unit: '%',
      icon: <Activity size={16} />,
      accent: 'text-accent-crit',
      goodDir: 'low',
    },
    {
      key: 'completion_rate_pct',
      label: 'Completion Rate',
      value: predictions.completion_rate_pct,
      unit: '%',
      icon: <TrendingUp size={16} />,
      accent: 'text-accent-ok',
      goodDir: 'high',
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-auto">
      <div>
        <h1 className="font-mono text-xl font-bold text-text-primary">Prediction Board</h1>
        <p className="text-text-secondary text-sm">Predições do modelo de gêmeo digital</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.key} className="bg-bg-surface border border-border rounded-lg p-5 flex flex-col gap-3">
            <div className={`flex items-center gap-2 ${item.accent} font-mono text-sm`}>
              {item.icon}
              {item.label}
            </div>
            <div className={`font-mono text-3xl font-bold ${item.accent}`}>
              {item.value.toFixed(2)}
              <span className="text-sm font-normal text-text-secondary ml-1">{item.unit}</span>
            </div>
            <div className="text-xs text-text-secondary font-mono">
              Direção favorável:{' '}
              <span className="text-text-primary">
                {item.goodDir === 'low' ? '↓ menor' : '↑ maior'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-2">
        <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
          Metadados do Modelo
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono mt-1">
          <div>
            <span className="text-text-secondary">Versão: </span>
            <span className="text-text-primary">{current.model_version}</span>
          </div>
          <div>
            <span className="text-text-secondary">Topologia: </span>
            <span className="text-text-primary">{current.topology}</span>
          </div>
          <div>
            <span className="text-text-secondary">Cenário: </span>
            <span className="text-accent-blue">{current.positioning.nearest_scenario}</span>
          </div>
          <div>
            <span className="text-text-secondary">Similaridade: </span>
            <span className="text-text-primary">{current.positioning.similarity_pct.toFixed(2)}%</span>
          </div>
          <div>
            <span className="text-text-secondary">Timestamp: </span>
            <span className="text-text-primary">
              {new Date(current.timestamp).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
