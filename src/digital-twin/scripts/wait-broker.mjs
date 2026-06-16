// Espera o broker Redpanda aceitar conexões na porta Kafka antes de criar tópicos.
import net from 'node:net';

const HOST = process.env.KAFKA_HOST || 'localhost';
const PORT = parseInt(process.env.KAFKA_PORT || '19092', 10);
const TIMEOUT_MS = parseInt(process.env.BROKER_WAIT_TIMEOUT_MS || '60000', 10);
const INTERVAL_MS = 1500;

function tryConnect() {
  return new Promise((resolve) => {
    const sock = net.connect({ host: HOST, port: PORT });
    const done = (ok) => { sock.destroy(); resolve(ok); };
    sock.setTimeout(2000);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
  });
}

const start = Date.now();
process.stdout.write(`[wait-broker] aguardando ${HOST}:${PORT} `);
while (Date.now() - start < TIMEOUT_MS) {
  if (await tryConnect()) {
    console.log('\n[wait-broker] broker pronto ✓');
    process.exit(0);
  }
  process.stdout.write('.');
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
}
console.error(`\n[wait-broker] timeout após ${TIMEOUT_MS}ms — o broker subiu? (docker compose ps)`);
process.exit(1);
