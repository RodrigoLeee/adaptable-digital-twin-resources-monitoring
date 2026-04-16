interface Props {
  scenario: string;
  similarity?: number;
  active?: boolean;
}

export function ScenarioChip({ scenario, similarity, active = false }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded border ${
        active
          ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/40'
          : 'bg-bg-elevated text-text-secondary border-border'
      }`}
    >
      {scenario}
      {similarity !== undefined && (
        <span
          className={`${active ? 'text-accent-blue' : 'text-text-secondary/60'} text-[10px]`}
        >
          {similarity.toFixed(1)}%
        </span>
      )}
    </span>
  );
}
