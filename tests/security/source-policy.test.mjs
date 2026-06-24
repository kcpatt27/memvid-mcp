#!/usr/bin/env node
/**
 * Security regression: path allowlist and URL source policy.
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const { getAllowedPathRoots, isPathWithinRoots, isUrlSourcesEnabled } = await import(
  pathToFileURL(path.join(projectRoot, 'dist/lib/path-policy.js')).href
);

const memoryBanksDir = path.join(projectRoot, 'memory-banks');
const roots = getAllowedPathRoots(memoryBanksDir, projectRoot);

const readmePath = path.join(projectRoot, 'README.md');
if (!isPathWithinRoots(readmePath, roots)) {
  console.error('FAIL: README.md should be within allowed roots (server dir)');
  process.exit(1);
}

const outsidePath = path.join(projectRoot, '..', 'outside-memvid-test.txt');
if (isPathWithinRoots(outsidePath, roots)) {
  console.error('FAIL: path outside project should not be allowed');
  process.exit(1);
}

const savedUrlEnv = process.env.MEMVID_ALLOW_URL_SOURCES;
delete process.env.MEMVID_ALLOW_URL_SOURCES;
if (isUrlSourcesEnabled()) {
  console.error('FAIL: URL sources should be disabled by default');
  process.exit(1);
}
process.env.MEMVID_ALLOW_URL_SOURCES = 'true';
if (!isUrlSourcesEnabled()) {
  console.error('FAIL: URL sources should enable when env is true');
  process.exit(1);
}
if (savedUrlEnv !== undefined) {
  process.env.MEMVID_ALLOW_URL_SOURCES = savedUrlEnv;
} else {
  delete process.env.MEMVID_ALLOW_URL_SOURCES;
}

// Bridge-level path check via subprocess is covered by integration; verify env is formatted
const { buildPythonBridgeEnv } = await import(
  pathToFileURL(path.join(projectRoot, 'dist/lib/python-env.js')).href
);
const bridgeEnv = buildPythonBridgeEnv({ memoryBanksDir, allowedPaths: roots });
if (!bridgeEnv.MEMORY_BANKS_DIR || !bridgeEnv.MEMVID_ALLOWED_PATHS) {
  console.error('FAIL: bridge env missing path policy vars');
  process.exit(1);
}
if (bridgeEnv.SECRET_SHOULD_NOT_FORWARD === 'leak') {
  console.error('FAIL: unexpected secret in bridge env');
  process.exit(1);
}

console.log('Source policy security checks passed.');
process.exit(0);
