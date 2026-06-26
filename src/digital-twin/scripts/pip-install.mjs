// Cria o venv do produtor (se preciso) e instala as dependências — cross-platform.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRODUCER = path.resolve(HERE, '..', 'digital-twin-producer');
const isWin = process.platform === 'win32';
const venv = path.join(PRODUCER, '.venv');
const venvPython = path.join(venv, isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python');

function run(cmd, args) {
  console.log(`[pip-install] ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: PRODUCER, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}

if (!existsSync(venvPython)) {
  const py = isWin ? 'python' : 'python3';
  run(py, ['-m', 'venv', '.venv']);
}
run(venvPython, ['-m', 'pip', 'install', '-q', '--upgrade', 'pip']);
run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt']);
console.log('[pip-install] produtor pronto ✓');
