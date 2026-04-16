import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { RecommendationOutput } from '../../types';

interface Props {
  history: RecommendationOutput[];
}

export function EnergyChart({ history }: Props) {
  const data = [...history]
    .reverse()
    .slice(-30)
    .map((r) => ({
      t: new Date(r.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      energy: r.predictions.energy_total_kwh,
    }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="t"
          tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          width={50}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
          itemStyle={{ color: '#f59e0b' }}
        />
        <Line
          type="monotone"
          dataKey="energy"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          name="Energy (kWh)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
