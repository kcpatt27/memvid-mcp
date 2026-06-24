#!/usr/bin/env node
/**
 * Security regression: run Python bridge URL policy probes (SSRF).
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const scriptPath = path.join(projectRoot, 'tests', 'security', 'ssrf-probe.py');

const pythonCandidates = [
  process.env.PYTHON_EXECUTABLE,
  process.platform === 'win32' ? path.join(projectRoot, 'memvid-env', 'Scripts', 'python.exe') : undefined,
  'python3',
  'python',
].filter(Boolean);

let lastError = '';

for (const pythonExecutable of pythonCandidates) {
  const result = spawnSync(pythonExecutable, [scriptPath], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  });

  if (result.error?.code === 'ENOENT') {
    lastError = `Python not found: ${pythonExecutable}`;
    continue;
  }

  if (result.status === 0) {
    process.stdout.write(result.stdout || 'SSRF probe security checks passed.\n');
    process.exit(0);
  }

  process.stderr.write(result.stderr || '');
  process.stdout.write(result.stdout || '');
  process.exit(result.status ?? 1);
}

console.error(`FAIL: could not run SSRF probe (${lastError || 'no python interpreter found'})`);
process.exit(1);
