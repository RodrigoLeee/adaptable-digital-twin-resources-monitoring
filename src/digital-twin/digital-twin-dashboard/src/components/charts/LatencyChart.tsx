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
import { RecommendationOutput } from '../../types';

interface Props {
  history: RecommendationOutput[];
  slaMaxWait?: number;
}

export function LatencyChart({ history, slaMaxWait }: Props) {
  const data = [...history]
    .reverse()
    .slice(-30)
    .map((r) => ({
      t: new Date(r.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      wait: r.predictions.wait_mean_s,
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
          itemStyle={{ color: '#3b82f6' }}
        />
        {slaMaxWait && (
          <ReferenceLine y={slaMaxWait} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'SLA', fill: '#ef4444', fontSize: 10 }} />
        )}
        <Line
          type="monotone"
          dataKey="wait"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="Wait (s)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
