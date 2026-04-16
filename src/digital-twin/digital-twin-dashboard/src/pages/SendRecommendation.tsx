import { useState, useRef } from 'react';
import { useRecommendation } from '../hooks/useRecommendation';
import { postParquetCollect } from '../api/collector';
import { DatacenterState, SLAConfig, ClientProfile, RecommendationOutput } from '../types';
import { Send, CheckCircle, AlertTriangle, Upload, FileText, Cpu } from 'lucide-react';

// ─── Default values ───────────────────────────────────────────────────────────

const defaultState: DatacenterState = {
  n_tasks_active: 100,
  exec_mean_s: 30,
  sim_duration_h: 8,
  energy_consumed_kwh: 400,
  wait_mean_s: 5,
  hosts_active: 10,
};

const defaultSla: SLAConfig = {
  max_energy_kwh: 1000,
  max_wait_s: 60,
  max_cost_usd: 500,
  max_cpu_pct: 80,
};

const defaultProfile: ClientProfile = {
  client_id: 'demo-client',
  name: 'Demo Client',
  priority: 'performance',
};

// ─── Field descriptors ────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  description: string;
  unit: string;
  step: string;
  min?: number;
}

const STATE_FIELDS: FieldDef[] = [
  {
    key: 'n_tasks_active',
    label: 'Tarefas Ativas',
    description: 'Número de tarefas em execução no datacenter no momento da coleta. Usado pelo modelo KNN para posicionar o estado atual nos cenários de referência.',
    unit: 'tarefas',
    step: '1',
    min: 0,
  },
  {
    key: 'exec_mean_s',
    label: 'Tempo Médio de Execução',
    description: 'Tempo médio que cada tarefa leva para ser concluída, em segundos. Indica a intensidade computacional da carga de trabalho.',
    unit: 's',
    step: '0.1',
    min: 0,
  },
  {
    key: 'sim_duration_h',
    label: 'Duração da Janela',
    description: 'Duração total da janela de observação ou simulação, em horas. Define o período sobre o qual as métricas foram coletadas.',
    unit: 'h',
    step: '0.5',
    min: 0,
  },
  {
    key: 'energy_consumed_kwh',
    label: 'Energia Consumida',
    description: 'Energia total consumida nesta janela de observação, em kilowatt-hora. Entrada direta para comparação com o limite de SLA.',
    unit: 'kWh',
    step: '1',
    min: 0,
  },
  {
    key: 'wait_mean_s',
    label: 'Tempo Médio de Espera',
    description: 'Tempo médio que uma tarefa aguarda na fila antes de iniciar execução, em segundos. Indicador primário de latência e saturação do sistema.',
    unit: 's',
    step: '0.1',
    min: 0,
  },
  {
    key: 'hosts_active',
    label: 'Hosts Ativos',
    description: 'Número de servidores físicos ligados e aceitando tarefas. Usado para calcular o custo operacional estimado (hosts × horas × preço/h).',
    unit: 'hosts',
    step: '1',
    min: 1,
  },
];

const SLA_FIELDS: FieldDef[] = [
  {
    key: 'max_energy_kwh',
    label: 'Limite de Energia',
    description: 'Consumo máximo de energia permitido pelo contrato de SLA. Ultrapassar este valor gera alerta e recomendação de otimização energética.',
    unit: 'kWh',
    step: '10',
    min: 0,
  },
  {
    key: 'max_wait_s',
    label: 'Latência Máxima',
    description: 'Tempo máximo de espera tolerado por tarefa. Define o nível de serviço de latência — violações indicam saturação da fila.',
    unit: 's',
    step: '1',
    min: 0,
  },
  {
    key: 'max_cost_usd',
    label: 'Orçamento Operacional',
    description: 'Custo operacional máximo aceito para este período, em USD. Calculado com base em hosts ativos × horas × preço por hora da instância.',
    unit: 'USD',
    step: '10',
    min: 0,
  },
  {
    key: 'max_cpu_pct',
    label: 'Limite de CPU',
    description: 'Utilização máxima de CPU permitida, em percentual. Acima deste valor o modelo gera alerta de capacidade. Deixe em branco para não monitorar CPU.',
    unit: '%',
    step: '1',
    min: 0,
  },
];

const PARQUET_FIELDS: { key: keyof ParquetFiles; label: string; description: string }[] = [
  {
    key: 'host',
    label: 'host.parquet',
    description: 'Métricas dos servidores físicos: CPU, memória, energia consumida por host ao longo do tempo.',
  },
  {
    key: 'powerSource',
    label: 'powerSource.parquet',
    description: 'Métricas das fontes de energia do datacenter: potência fornecida, variação de carga.',
  },
  {
    key: 'service',
    label: 'service.parquet',
    description: 'Métricas dos serviços em execução: número de VMs, estado, alocações de recursos.',
  },
  {
    key: 'task',
    label: 'task.parquet',
    description: 'Métricas das tarefas individuais: tempos de chegada, execução, espera e conclusão.',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParquetFiles {
  host: File | null;
  powerSource: File | null;
  service: File | null;
  task: File | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NumberField({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: number | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-mono text-text-primary font-semibold uppercase tracking-wide">
          {def.label}
        </label>
        <span className="text-xs font-mono text-text-secondary">{def.unit}</span>
      </div>
      <input
        type="number"
        step={def.step}
        min={def.min}
        value={value ?? ''}
        placeholder={def.key === 'max_cpu_pct' ? 'sem limite' : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="bg-bg-elevated border border-border rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-blue"
      />
      <p className="text-xs text-text-secondary leading-relaxed">{def.description}</p>
    </div>
  );
}

function FileField({
  def,
  file,
  onFile,
}: {
  def: { key: string; label: string; description: string };
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-mono text-text-primary font-semibold uppercase tracking-wide">
          {def.label}
        </label>
        {file && (
          <span className="text-xs font-mono text-accent-ok">{file.name}</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`flex items-center gap-2 border rounded px-3 py-2 text-sm font-mono transition-colors text-left ${
          file
            ? 'border-accent-ok/50 bg-accent-ok/5 text-accent-ok'
            : 'border-border bg-bg-elevated text-text-secondary hover:border-accent-blue hover:text-text-primary'
        }`}
      >
        {file ? <CheckCircle size={12} /> : <Upload size={12} />}
        {file ? 'Arquivo selecionado — clique para trocar' : 'Selecionar arquivo .parquet'}
      </button>
      <input
        ref={ref}
        type="file"
        accept=".parquet"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <p className="text-xs text-text-secondary leading-relaxed">{def.description}</p>
    </div>
  );
}

function ResultPanel({ result }: { result: RecommendationOutput }) {
  return (
    <div className="bg-bg-surface border border-accent-ok/30 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-accent-ok font-mono text-sm font-bold">
        <CheckCircle size={14} />
        Recomendação processada — status:{' '}
        <span
          className={
            result.status === 'ok'
              ? 'text-accent-ok'
              : result.status === 'attention'
              ? 'text-accent-warn'
              : 'text-accent-crit'
          }
        >
          {result.status}
        </span>
      </div>
      {result.warnings.length > 0 && (
        <div className="flex flex-col gap-1">
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs font-mono text-accent-warn">
              <AlertTriangle size={10} className="mt-0.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}
      <pre className="text-xs font-mono text-text-secondary bg-bg-elevated rounded p-3 overflow-auto max-h-72">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

function SLASection({
  sla,
  onUpdate,
}: {
  sla: SLAConfig;
  onUpdate: (key: keyof SLAConfig, val: string) => void;
}) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
          Limites de SLA
        </h2>
        <span className="text-xs font-mono text-text-secondary bg-bg-elevated px-2 py-0.5 rounded">
          Service Level Agreement
        </span>
      </div>
      <p className="text-xs text-text-secondary">
        Define os limiares contratuais. O modelo compara as previsões contra estes valores e gera
        alertas quando há violação ou risco iminente.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SLA_FIELDS.map((def) => (
          <NumberField
            key={def.key}
            def={def}
            value={sla[def.key as keyof SLAConfig] as number | undefined}
            onChange={(v) => onUpdate(def.key as keyof SLAConfig, v)}
          />
        ))}
      </div>
    </div>
  );
}

function ProfileSection({
  profile,
  onUpdate,
}: {
  profile: ClientProfile;
  onUpdate: (p: ClientProfile) => void;
}) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-4">
      <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
        Perfil do Cliente
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-text-primary font-semibold uppercase tracking-wide">
            client_id
          </label>
          <input
            type="text"
            value={profile.client_id}
            onChange={(e) => onUpdate({ ...profile, client_id: e.target.value })}
            className="bg-bg-elevated border border-border rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-blue"
          />
          <p className="text-xs text-text-secondary">Identificador único — determina onde os resultados são salvos em disco.</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-text-primary font-semibold uppercase tracking-wide">
            name
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => onUpdate({ ...profile, name: e.target.value })}
            className="bg-bg-elevated border border-border rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-blue"
          />
          <p className="text-xs text-text-secondary">Nome legível exibido nos boards e relatórios.</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-text-primary font-semibold uppercase tracking-wide">
            prioridade
          </label>
          <select
            value={profile.priority}
            onChange={(e) =>
              onUpdate({ ...profile, priority: e.target.value as ClientProfile['priority'] })
            }
            className="bg-bg-elevated border border-border rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-blue"
          >
            <option value="availability">availability — prioriza uptime e redundância</option>
            <option value="cost">cost — prioriza redução de custo operacional</option>
            <option value="performance">performance — prioriza latência e throughput</option>
            <option value="energy">energy — prioriza eficiência energética</option>
          </select>
          <p className="text-xs text-text-secondary">Define qual pilar o modelo deve priorizar ao gerar recomendações.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'manual' | 'parquet';

export default function SendRecommendation() {
  const [tab, setTab] = useState<Tab>('manual');

  // Flow 1 — manual
  const [state, setState] = useState(defaultState);
  const [sla, setSla] = useState(defaultSla);
  const [profile, setProfile] = useState(defaultProfile);
  const { loading: manualLoading, error: manualError, result: manualResult, send } = useRecommendation();

  // Flow 2 — parquet
  const [parquetFiles, setParquetFiles] = useState<ParquetFiles>({
    host: null, powerSource: null, service: null, task: null,
  });
  const [parquetSla, setParquetSla] = useState(defaultSla);
  const [parquetProfile, setParquetProfile] = useState(defaultProfile);
  const [parquetLoading, setParquetLoading] = useState(false);
  const [parquetError, setParquetError] = useState<string | null>(null);
  const [parquetResult, setParquetResult] = useState<RecommendationOutput | null>(null);

  function updateState(key: keyof DatacenterState, val: string) {
    setState((s) => ({ ...s, [key]: Number(val) }));
  }

  function updateSla(key: keyof SLAConfig, val: string) {
    setSla((s) => ({
      ...s,
      [key]: val === '' ? undefined : Number(val),
    }));
  }

  function updateParquetSla(key: keyof SLAConfig, val: string) {
    setParquetSla((s) => ({
      ...s,
      [key]: val === '' ? undefined : Number(val),
    }));
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(state, sla, profile);
  }

  async function handleParquetSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { host, powerSource, service, task } = parquetFiles;
    if (!host || !powerSource || !service || !task) {
      setParquetError('Selecione os 4 arquivos parquet antes de enviar.');
      return;
    }
    setParquetLoading(true);
    setParquetError(null);
    try {
      const result = await postParquetCollect(
        { host, powerSource, service, task },
        parquetSla,
        parquetProfile,
      );
      setParquetResult(result);
    } catch (err) {
      setParquetError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setParquetLoading(false);
    }
  }

  const parquetReady = Object.values(parquetFiles).every(Boolean);

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-auto">
      {/* Header */}
      <div>
        <h1 className="font-mono text-xl font-bold text-text-primary">Injetar Estado no Gêmeo Digital</h1>
        <p className="text-text-secondary text-sm mt-1">
          Envie um snapshot do datacenter para o modelo. O gêmeo analisa o estado, posiciona nos
          cenários de referência e gera previsões + recomendações via SSE para todos os boards.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-elevated border border-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-semibold transition-colors ${
            tab === 'manual'
              ? 'bg-accent-blue text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Cpu size={12} />
          Estado Manual
        </button>
        <button
          onClick={() => setTab('parquet')}
          className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-semibold transition-colors ${
            tab === 'parquet'
              ? 'bg-accent-blue text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileText size={12} />
          Upload Parquet (OpenDC)
        </button>
      </div>

      {/* ── Flow 1: Manual ── */}
      {tab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-6">
          <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
                  Estado do Datacenter
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Snapshot das métricas operacionais atuais. Estes valores são a entrada direta
                  para o modelo KNN de posicionamento e o regressor polinomial de previsão.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {STATE_FIELDS.map((def) => (
                <NumberField
                  key={def.key}
                  def={def}
                  value={state[def.key as keyof DatacenterState]}
                  onChange={(v) => updateState(def.key as keyof DatacenterState, v)}
                />
              ))}
            </div>
          </div>

          <SLASection sla={sla} onUpdate={updateSla} />
          <ProfileSection profile={profile} onUpdate={setProfile} />

          <button
            type="submit"
            disabled={manualLoading}
            className="flex items-center justify-center gap-2 bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-50 text-white font-mono text-sm font-bold py-3 px-6 rounded transition-colors"
          >
            <Send size={14} />
            {manualLoading ? 'Processando...' : 'Enviar Estado ao Gêmeo Digital'}
          </button>

          {manualError && (
            <div className="flex items-start gap-2 bg-accent-crit/10 border border-accent-crit/30 rounded-lg p-4 text-accent-crit text-sm font-mono">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {manualError}
            </div>
          )}
          {manualResult && <ResultPanel result={manualResult} />}
        </form>
      )}

      {/* ── Flow 2: Parquet ── */}
      {tab === 'parquet' && (
        <form onSubmit={handleParquetSubmit} className="flex flex-col gap-6">
          <div className="bg-bg-surface border border-border rounded-lg p-4 flex flex-col gap-4">
            <div>
              <h2 className="font-mono text-sm text-text-secondary uppercase tracking-wider">
                Arquivos OpenDC
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                O OpenDC exporta 4 arquivos parquet ao final de cada simulação. O collector extrai
                automaticamente o estado do datacenter (convertendo timestamps ms→s e energia J→kWh)
                antes de enviar ao modelo.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {PARQUET_FIELDS.map((def) => (
                <FileField
                  key={def.key}
                  def={def}
                  file={parquetFiles[def.key]}
                  onFile={(f) => setParquetFiles((prev) => ({ ...prev, [def.key]: f }))}
                />
              ))}
            </div>
            {parquetReady && (
              <div className="flex items-center gap-2 text-xs font-mono text-accent-ok bg-accent-ok/10 border border-accent-ok/20 rounded px-3 py-2">
                <CheckCircle size={12} />
                4/4 arquivos selecionados — pronto para processar
              </div>
            )}
          </div>

          <SLASection sla={parquetSla} onUpdate={updateParquetSla} />
          <ProfileSection profile={parquetProfile} onUpdate={setParquetProfile} />

          <button
            type="submit"
            disabled={parquetLoading || !parquetReady}
            className="flex items-center justify-center gap-2 bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-50 text-white font-mono text-sm font-bold py-3 px-6 rounded transition-colors"
          >
            <Upload size={14} />
            {parquetLoading
              ? 'Extraindo estado dos parquets...'
              : !parquetReady
              ? `Aguardando arquivos (${Object.values(parquetFiles).filter(Boolean).length}/4)`
              : 'Processar Parquets no Gêmeo Digital'}
          </button>

          {parquetError && (
            <div className="flex items-start gap-2 bg-accent-crit/10 border border-accent-crit/30 rounded-lg p-4 text-accent-crit text-sm font-mono">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {parquetError}
            </div>
          )}
          {parquetResult && <ResultPanel result={parquetResult} />}
        </form>
      )}
    </div>
  );
}
