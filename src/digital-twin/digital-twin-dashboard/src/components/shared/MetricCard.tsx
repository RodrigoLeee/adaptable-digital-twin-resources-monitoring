import { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  icon?: ReactNode;
  accent?: 'ok' | 'warn' | 'crit' | 'blue' | 'default';
  className?: string;
}

const accentMap = {
  ok: 'text-accent-ok',
  warn: 'text-accent-warn',
  crit: 'text-accent-crit',
  blue: 'text-accent-blue',
  default: 'text-text-primary',
};

export function MetricCard({
  label,
  value,
  unit,
  sub,
  icon,
  accent = 'default',
  className = '',
}: Props) {
  return (
    <div
      className={`bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-1 ${className}`}
    >
      <div className="flex items-center gap-2 text-text-secondary text-xs font-mono uppercase tracking-wider">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className={`font-mono font-bold text-2xl ${accentMap[accent]} leading-none`}>
        {value}
        {unit && (
          <span className="text-sm font-normal text-text-secondary ml-1">{unit}</span>
        )}
      </div>
      {sub && <div className="text-xs text-text-secondary font-mono">{sub}</div>}
    </div>
  );
}
