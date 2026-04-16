import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CostEntry {
  scenario: string;
  cost: number;
  active?: boolean;
}

interface Props {
  data: CostEntry[];
}

export function CostChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="scenario"
          tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }}
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          width={55}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
          itemStyle={{ color: '#10b981' }}
        />
        <Bar dataKey="cost" name="Cost (USD)" radius={[2, 2, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell
              key={idx}
              fill={entry.active ? '#3b82f6' : '#10b981'}
              opacity={entry.active ? 1 : 0.6}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
