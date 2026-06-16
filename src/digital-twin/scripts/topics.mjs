// Cria os tópicos do gêmeo digital de forma idempotente (ignora "já existe").
import { spawnSync } from 'node:child_process';

const TOPICS = (process.env.DT_TOPICS || 'workload.events dt.recommendations').split(/\s+/);

const r = spawnSync(
  'docker',
  ['compose', 'exec', '-T', 'redpanda', 'rpk', 'topic', 'create', ...TOPICS],
  { encoding: 'utf-8' },
);

const out = `${r.stdout || ''}${r.stderr || ''}`;
process.stdout.write(out);

if (r.status === 0) {
  console.log('[topics] tópicos prontos ✓');
  process.exit(0);
}
// rpk retorna erro se o tópico já existe — tratamos como sucesso.
if (/already exists|TOPIC_ALREADY_EXISTS/i.test(out)) {
  console.log('[topics] tópicos já existiam ✓');
  process.exit(0);
}
console.error('[topics] falha ao criar tópicos (o broker está de pé? docker compose ps)');
process.exit(r.status || 1);
