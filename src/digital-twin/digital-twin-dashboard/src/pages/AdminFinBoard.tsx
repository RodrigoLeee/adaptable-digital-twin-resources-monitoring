import { useRecommendationStore } from '../store/recommendationStore';
import { MetricCard } from '../components/shared/MetricCard';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { DollarSign, Zap, Cpu } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

function ProgressBar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const overLimit = value > max;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs font-mono text-text-secondary">
        <span>{label}</span>
        <span>
          {value.toFixed(2)} / {max}{' '}
          <span className={overLimit ? 'text-accent-crit' : 'text-text-secondary'}>
            ({pct.toFixed(1)}%)
          </span>
        </span>
      </div>
      <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: overLimit ? '#ef4444' : color }}
        />
      </div>
    </div>
  );
}

export default function AdminFinBoard() {
  const current = useRecommendationStore((s) => s.current);
  const history = useRecommendationStore((s) => s.history);

  if (!current) return <LoadingSpinner />;

  const { predictions, headroom, sla_config } = current;

  // Build cost history from store (oldest → newest for the chart)
  const costHistory = [...history]
    .reverse()
    .map((r, i) => ({
      t: i + 1,
      cost: Number(r.predictions.estimated_cost_usd.toFixed(2)),
      energy: Number(r.predictions.energy_total_kwh.toFixed(4)),
    }));

  const cpuLimit = sla_config.max_cpu_pct;

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-auto">
      <div>
        <h1 className="font-mono text-xl font-bold text-text-primary">Admin / Finance Board</h1>
        <p className="text-text-secondary text-sm">
          Custo operacional estimado, energia e conformidade com SLA financeiro
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Custo Estimado"
          value={predictions.estimated_cost_usd.toFixed(2)}
          unit="USD"
          icon={<DollarSign size={12} />}
          accent={predictions.estimated_cost_usd > sla_config.max_cost_usd ? 'crit' : 'ok'}
        />
        <MetricCard
          label="Energia Total"
          value={predictions.energy_total_kwh.toFixed(4)}
          unit="kWh"
          icon={<Zap size={12} />}
          accent={predictions.energy_total_kwh > sla_config.max_energy_kwh ? 'crit' : 'warn'}
        />
        <MetricCard
          label="Margem de Custo"
          value={headroom.cost_margin_pct != null ? headroom.cost_margin_pct.toFixed(1) : 'N/A'}
          unit={headroom.cost_margin_pct != null ? '%' : ''}
          accent={
            headroom.cost_margin_pct == null
              ? 'default'
              : headroom.cost_margin_pct > 20
              ? 'ok'
              : 'warn'
          }
        />
        <MetricCard
          label="Utilização CPU"
          value={predictions.cpu_util_mean_pct.toFixed(1)}
          unit="%"
          icon={<Cpu size={12} />}
          accent={
            cpuLimit != null
              ? predictions.cpu_util_mean_pct > cpuLimit
                ? 'crit'
                : 'ok'
              : 'default'
          }
        />
      </div>

      {/* SLA progress bars */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-4">
        <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
          Conformidade com SLA
        </h2>
        <ProgressBar
          label="Custo vs orçamento SLA"
          value={predictions.estimated_cost_usd}
          max={sla_config.max_cost_usd}
          color="#10b981"
        />
        <ProgressBar
          label="Energia vs envelope seguro"
          value={predictions.energy_total_kwh}
          max={sla_config.max_energy_kwh}
          color="#f59e0b"
        />
        {cpuLimit != null && (
          <ProgressBar
            label="CPU vs limite SLA"
            value={predictions.cpu_util_mean_pct}
            max={cpuLimit}
            color="#3b82f6"
          />
        )}
      </div>

      {/* Cost history chart */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
        <div>
          <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
            Histórico de Custo Estimado
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Evolução do custo operacional previsto ao longo dos estados recebidos nesta sessão.
            Cada ponto é um snapshot injetado no gêmeo digital.
          </p>
        </div>
        {costHistory.length < 2 ? (
          <p className="text-xs font-mono text-text-secondary italic py-8 text-center">
            Aguardando mais estados — gráfico disponível a partir de 2 coletas
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={costHistory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="t"
                tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                label={{ value: 'coleta #', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 10 }}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                width={60}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
                labelFormatter={(v) => `Coleta #${v}`}
                formatter={(v: number) => [`$${v.toFixed(2)}`, 'Custo estimado']}
              />
              <ReferenceLine
                y={sla_config.max_cost_usd}
                stroke="#ef4444"
                strokeDasharray="4 2"
                label={{ value: 'SLA', fill: '#ef4444', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Positioning reference table */}
      <div className="bg-bg-surface border border-border rounded-lg p-4">
        <div className="mb-3">
          <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
            Cenários de Referência (KNN)
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Âncoras de treinamento mais próximas do estado atual no espaço de features. Distância
            euclidiana no espaço normalizado — não são opções operacionais, mas marcos de calibração
            do modelo.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-text-secondary border-b border-border">
                <th className="text-left py-2 pr-4">Cenário</th>
                <th className="text-right py-2 pr-4">Distância KNN</th>
                <th className="text-right py-2">Similaridade</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(current.positioning.distances)
                .sort(([, a], [, b]) => a - b)
                .map(([scenario, dist]) => {
                  const isNearest = scenario === current.positioning.nearest_scenario;
                  const maxDist = Math.max(...Object.values(current.positioning.distances));
                  const simPct = maxDist > 0 ? ((1 - dist / maxDist) * 100).toFixed(1) : '100.0';
                  return (
                    <tr
                      key={scenario}
                      className={`border-b border-border/50 ${
                        isNearest ? 'text-accent-blue' : 'text-text-secondary'
                      }`}
                    >
                      <td className="py-1.5 pr-4">
                        {scenario}
                        {isNearest && (
                          <span className="ml-2 text-accent-blue bg-accent-blue/10 px-1 rounded text-xs">
                            mais próximo
                          </span>
                        )}
                      </td>
                      <td className="text-right py-1.5 pr-4">{dist.toFixed(4)}</td>
                      <td className="text-right py-1.5">{simPct}%</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
