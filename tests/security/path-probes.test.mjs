#!/usr/bin/env node
/**
 * Security regression: deny reading sensitive paths outside allowed roots.
 */
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const { getAllowedPathRoots, assertAllowedSourcePath } = await import(
  pathToFileURL(path.join(projectRoot, 'dist/lib/path-policy.js')).href
);

const memoryBanksDir = path.join(projectRoot, 'memory-banks');
const roots = getAllowedPathRoots(memoryBanksDir, projectRoot);

function expectDenied(label, targetPath) {
  try {
    assertAllowedSourcePath(targetPath, roots);
    console.error(`FAIL: ${label} should be denied: ${targetPath}`);
    process.exit(1);
  } catch {
    // expected
  }
}

const sensitivePath =
  process.platform === 'win32'
    ? path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts')
    : '/etc/passwd';

expectDenied('sensitive system file', sensitivePath);
expectDenied('path traversal outside workspace', path.resolve(projectRoot, '../../../tmp/evil'));
expectDenied('user home directory', os.homedir());

console.log('Path probe security checks passed.');
process.exit(0);
