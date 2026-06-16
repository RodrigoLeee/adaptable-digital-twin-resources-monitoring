// Roda o produtor Python usando o interpretador do venv — cross-platform.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRODUCER = path.resolve(HERE, '..', 'digital-twin-producer');
const isWin = process.platform === 'win32';
const venvPython = path.join(PRODUCER, '.venv', isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python');

if (!existsSync(venvPython)) {
  console.error('[run-producer] venv não encontrado. Rode antes: npm run install:producer');
  process.exit(1);
}

const child = spawn(venvPython, ['producer.py'], { cwd: PRODUCER, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
