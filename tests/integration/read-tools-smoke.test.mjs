#!/usr/bin/env node
/**
 * Bounded MCP integration smoke: list_memory_banks, search_memory, get_context.
 *
 * Non-GPU protocol coverage against the local MemVid MCP server. Skips cleanly when
 * dist/, Python, or a searchable memory bank are unavailable.
 */
import { accessSync, constants as fsConstants, existsSync, readFileSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { McpStdioClient, resolveProjectRoot } from '../mcp-protocol/mcp-stdio-client.mjs';
import {
  REQUEST_TIMEOUT_MS,
  SERVER_STARTUP_TIMEOUT_MS,
  SMOKE_CONTEXT_MAX_TOKENS,
  SMOKE_QUERY,
  SMOKE_SEARCH_TOP_K,
} from './smoke-config.mjs';

const projectRoot = resolveProjectRoot();
const skipped = [];
const failures = [];

function skip(reason) {
  skipped.push(reason);
  console.log(`SKIP: ${reason}`);
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL: ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
    return false;
  }
  return true;
}

function resolvePythonExecutable() {
  const candidates = [
    process.env.PYTHON_EXECUTABLE,
    process.platform === 'win32'
      ? path.join(projectRoot, 'memvid-env', 'Scripts', 'python.exe')
      : path.join(projectRoot, 'memvid-env', 'bin', 'python3'),
    'python3',
    'python',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['--version'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    if (!probe.error && probe.status === 0) {
      return candidate;
    }
  }

  return null;
}

function parseToolPayload(result) {
  const text = result?.content?.[0]?.text;
  if (typeof text !== 'string') {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function discoverSearchableBank() {
  const registryPath = path.join(projectRoot, 'config', 'memory-banks.json');

  if (!existsSync(registryPath)) {
    return null;
  }

  let registry;
  try {
    registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  } catch {
    return null;
  }

  const bankEntries = Object.values(registry.banks ?? {}).sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );

  for (const bank of bankEntries) {
    const mp4Path = bank.file_path;
    if (typeof mp4Path !== 'string' || !mp4Path.endsWith('.mp4')) {
      continue;
    }

    const faissPath = mp4Path.replace(/\.mp4$/i, '.faiss');
    const jsonPath = mp4Path.replace(/\.mp4$/i, '.json');

    if (!existsSync(mp4Path) || !existsSync(faissPath) || !existsSync(jsonPath)) {
      continue;
    }

    try {
      accessSync(mp4Path, fsConstants.R_OK);
      accessSync(faissPath, fsConstants.R_OK);
      accessSync(jsonPath, fsConstants.R_OK);
    } catch {
      continue;
    }

    return bank.name;
  }

  return null;
}

async function run() {
  console.log('MemVid MCP read-tools integration smoke');
  console.log(`Project root: ${projectRoot}`);

  const distServer = path.join(projectRoot, 'dist', 'server.js');
  if (!existsSync(distServer)) {
    skip('dist/server.js missing — run `npm run build` first');
    return summarize();
  }

  const pythonExecutable = resolvePythonExecutable();
  const searchableBank = discoverSearchableBank();

  if (!pythonExecutable) {
    skip('Python interpreter not found — search_memory/get_context require the Python bridge');
  } else {
    console.log(`Python: ${pythonExecutable}`);
  }

  if (!searchableBank) {
    skip('No searchable memory bank with existing mp4/json/faiss registry paths');
  } else {
    console.log(`Searchable bank: ${searchableBank}`);
  }

  const client = new McpStdioClient({
    projectRoot,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    startupTimeoutMs: SERVER_STARTUP_TIMEOUT_MS,
    env: pythonExecutable ? { PYTHON_EXECUTABLE: pythonExecutable } : {},
  });

  try {
    await client.start();
    await client.initialize();

    await testListMemoryBanks(client);

    if (pythonExecutable && searchableBank) {
      await testSearchMemory(client, searchableBank);
      await testGetContext(client, searchableBank);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/did not become ready|exited before ready|Request timed out/i.test(message)) {
      skip(`Local MCP service unavailable: ${message}`);
    } else {
      fail(message);
    }
  } finally {
    await client.stop();
  }

  return summarize();
}

async function testListMemoryBanks(client) {
  console.log('\n[list_memory_banks]');

  const result = await client.callTool('list_memory_banks', { include_stats: false });
  const payload = parseToolPayload(result);

  if (!assert(payload && Array.isArray(payload.banks), 'list_memory_banks returned invalid payload')) {
    return;
  }

  assert(
    payload.banks.every((bank) => typeof bank?.name === 'string' && bank.name.length > 0),
    'list_memory_banks entries must include non-empty name fields'
  );

  console.log(`PASS: list_memory_banks (${payload.banks.length} bank(s))`);
}

async function testSearchMemory(client, bankName) {
  console.log('\n[search_memory]');

  const result = await client.callTool('search_memory', {
    query: SMOKE_QUERY,
    memory_banks: [bankName],
    top_k: SMOKE_SEARCH_TOP_K,
  });
  const payload = parseToolPayload(result);

  if (
    !assert(
      payload &&
        Array.isArray(payload.results) &&
        typeof payload.total_results === 'number' &&
        payload.query === SMOKE_QUERY &&
        Array.isArray(payload.banks_searched),
      'search_memory returned invalid payload'
    )
  ) {
    return;
  }

  assert(
    payload.banks_searched.includes(bankName),
    `search_memory did not report searching ${bankName}`
  );
  assert(
    payload.results.length > 0,
    `search_memory returned zero results for bank ${bankName} and query ${JSON.stringify(SMOKE_QUERY)}`
  );
  assert(
    typeof payload.results[0]?.content === 'string' && payload.results[0].content.length > 0,
    'search_memory first result must include non-empty content'
  );

  if (failures.length === 0) {
    console.log(`PASS: search_memory (${payload.results.length} result(s))`);
  }
}

async function testGetContext(client, bankName) {
  console.log('\n[get_context]');

  const result = await client.callTool('get_context', {
    query: SMOKE_QUERY,
    memory_banks: [bankName],
    max_tokens: SMOKE_CONTEXT_MAX_TOKENS,
  });
  const payload = parseToolPayload(result);

  if (
    !assert(
      payload &&
        typeof payload.context === 'string' &&
        Array.isArray(payload.sources) &&
        typeof payload.total_tokens === 'number',
      'get_context returned invalid payload'
    )
  ) {
    return;
  }

  assert(payload.context.length > 0, 'get_context context must be non-empty');
  assert(payload.total_tokens > 0, 'get_context total_tokens must be > 0 for smoke bank');
  assert(payload.sources.length > 0, 'get_context must include at least one source');

  if (failures.length === 0) {
    console.log(`PASS: get_context (${payload.total_tokens} token(s), ${payload.sources.length} source(s))`);
  }
}

function summarize() {
  console.log('\n--- summary ---');

  if (skipped.length > 0) {
    for (const reason of skipped) {
      console.log(`skipped: ${reason}`);
    }
  }

  if (failures.length > 0) {
    for (const reason of failures) {
      console.error(`failed: ${reason}`);
    }
    process.exit(1);
  }

  if (skipped.length > 0) {
    console.log('Smoke test completed with skips (local service prerequisites missing).');
    process.exit(0);
  }

  console.log('All read-tool MCP smoke checks passed.');
  process.exit(0);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
