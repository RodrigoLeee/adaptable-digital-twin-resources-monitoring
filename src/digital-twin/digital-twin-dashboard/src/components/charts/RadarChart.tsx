import {
  RadarChart as RechartsRadar,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface RadarEntry {
  metric: string;
  value: number;
}

interface Props {
  data: RadarEntry[];
}

export function RadarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RechartsRadar data={data} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'JetBrains Mono' }}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
          itemStyle={{ color: '#3b82f6' }}
        />
        <Radar
          dataKey="value"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.25}
          name="Normalizado"
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
