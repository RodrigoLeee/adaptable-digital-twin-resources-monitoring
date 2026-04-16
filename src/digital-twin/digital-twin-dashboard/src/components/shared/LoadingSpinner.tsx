export function LoadingSpinner({ label = 'Aguardando dados SSE...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-text-secondary">
      <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-sm">{label}</span>
    </div>
  );
}
