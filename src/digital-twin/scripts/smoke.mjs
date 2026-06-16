// Smoke test: confere a saúde da API e um /recommend, validando o bloco optimization.
const API = process.env.API_URL || 'http://localhost:3002';

const state = {
  n_tasks_active: 110, exec_mean_s: 0.22, sim_duration_h: 0.0015,
  energy_consumed_kwh: 0.011, wait_mean_s: 0.44, hosts_active: 100,
};
const sla = { max_energy_kwh: 0.015, max_wait_s: 0.55, max_cost_usd: 0.008 };

try {
  const health = await fetch(`${API}/health`).then((r) => r.json());
  console.log(`[smoke] ${API}/health ->`, JSON.stringify(health));

  const rec = await fetch(`${API}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, sla }),
  }).then((r) => r.json());

  const o = rec.optimization;
  console.log('[smoke] optimization:', JSON.stringify(o, null, 2));
  if (!o || o.recommended_config?.hosts == null) {
    console.error('[smoke] ✗ resposta sem bloco optimization — bundle desatualizado? reinicie a API');
    process.exit(1);
  }
  console.log(`[smoke] ✓ recomendado ${o.recommended_config.hosts} hosts (economia ${o.savings.pct}%)`);
} catch (err) {
  console.error(`[smoke] ✗ falha ao contatar ${API} — a API está rodando? (npm run dev:api)`);
  console.error(`        ${err.message}`);
  process.exit(1);
}
