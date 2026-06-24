#!/usr/bin/env node
/**
 * Create or refresh the ollama-agent-stack memory bank from sibling repos.
 *
 * Usage:
 *   node scripts/create-local-ai-bank.mjs
 *
 * Requires: npm run build, memvid-env, MEMVID_ALLOWED_PATHS covers personal-projects.
 */
import { existsSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const projectRoot = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const personalProjects = path.resolve(projectRoot, '..');

process.env.PYTHON_EXECUTABLE = path.resolve(
  process.env.PYTHON_EXECUTABLE || path.join(projectRoot, 'memvid-env', 'Scripts', 'python.exe')
);
process.env.MEMVID_ALLOWED_PATHS = personalProjects;
process.env.MEMORY_BANKS_DIR = path.join(projectRoot, 'memory-banks');

const BANK_NAME = process.env.MEMVID_BANK_NAME || 'ollama-agent-stack';

/** @type {Array<{ id: string, root: string, sources: import('../dist/types/index.js').Source[] }>} */
const AGENT_PROJECTS = [
  {
    id: 'home-agent',
    root: path.join(personalProjects, 'home-agent'),
    sources: [
      { type: 'directory', path: 'memory-bank', options: { file_types: ['md'] } },
      { type: 'file', path: 'README.md' },
      { type: 'file', path: 'docs/stack-map.md' },
      { type: 'file', path: 'config/chat-daily.toml' },
    ],
  },
  {
    id: 'atlas-core',
    root: path.join(personalProjects, 'atlas-core'),
    sources: [
      { type: 'directory', path: 'memory-bank', options: { file_types: ['md'] } },
      { type: 'file', path: 'README.md' },
      { type: 'file', path: 'integrations/home_agent.md' },
    ],
  },
  {
    id: 'living-state-machine',
    root: path.join(personalProjects, 'living-state-machine'),
    sources: [
      { type: 'directory', path: 'memory-bank', options: { file_types: ['md'] } },
      { type: 'file', path: 'README.md' },
      { type: 'file', path: 'docs/architecture.md' },
    ],
  },
  {
    id: 'meridian-whisper',
    root: path.join(personalProjects, 'meridian-whisper'),
    sources: [
      { type: 'directory', path: 'memory-bank', options: { file_types: ['md'] } },
      { type: 'file', path: 'README.md' },
    ],
  },
  {
    id: 'perplexica-mcp',
    root: path.join(personalProjects, 'perplexica-mcp'),
    sources: [
      { type: 'directory', path: 'memory-bank', options: { file_types: ['md'] } },
      { type: 'file', path: 'README.md' },
      { type: 'file', path: 'ARCHITECTURE.md' },
    ],
  },
  {
    id: 'memvid-mcp',
    root: projectRoot,
    sources: [
      { type: 'file', path: 'README.md' },
      { type: 'file', path: 'docs/AGENT-MCP-SETUP.md' },
      { type: 'file', path: 'config/mcp.example.json' },
      { type: 'file', path: 'config/openjarvis-mcp-snippet.toml' },
    ],
  },
];

function resolveSources(project) {
  const out = [];
  for (const src of project.sources) {
    const fullPath = path.join(project.root, src.path);
    if (!existsSync(fullPath)) {
      console.warn(`  skip missing [${project.id}]: ${fullPath}`);
      continue;
    }
    out.push({
      type: src.type,
      path: fullPath,
      ...(src.options ? { options: src.options } : {}),
    });
  }
  return out;
}

const config = {
  memvid: {
    chunk_size: 512,
    overlap: 50,
    embedding_model: 'sentence-transformers/all-MiniLM-L6-v2',
  },
  storage: {
    memory_banks_dir: process.env.MEMORY_BANKS_DIR,
    max_file_size: '100MB',
    cleanup_temp_files: true,
  },
  search: {
    default_top_k: 5,
    min_score_threshold: 0.25,
    max_context_tokens: 8000,
  },
  performance: {
    cache_size: 100,
    parallel_processing: true,
    max_concurrent_searches: 5,
  },
};

const { MemoryTools } = await import(
  pathToFileURL(path.join(projectRoot, 'dist/tools/memory.js')).href
);
const { StorageManager } = await import(
  pathToFileURL(path.join(projectRoot, 'dist/lib/storage.js')).href
);

const tools = new MemoryTools(config);
const storage = new StorageManager(config);
await storage.initialize();
await tools.initialize();

const bankBase = path.join(process.env.MEMORY_BANKS_DIR, BANK_NAME);
const bankExists =
  existsSync(`${bankBase}.mp4`) ||
  existsSync(`${bankBase}.faiss`) ||
  existsSync(`${bankBase}.json`) ||
  (await storage.getMemoryBank(BANK_NAME));

if (bankExists) {
  console.log(`Removing existing bank "${BANK_NAME}" for refresh...`);
  try {
    await storage.removeMemoryBank(BANK_NAME, true);
  } catch {
    for (const ext of ['.mp4', '.faiss', '.json']) {
      const filePath = `${bankBase}${ext}`;
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    }
  }
}

const sources = [];
for (const project of AGENT_PROJECTS) {
  const resolved = resolveSources(project);
  console.log(`  ${project.id}: ${resolved.length} source(s)`);
  sources.push(...resolved);
}

if (sources.length === 0) {
  console.error('No sources found — check repo paths under personal-projects');
  await tools.shutdown();
  process.exit(1);
}

console.log(`\nCreating memory bank: ${BANK_NAME} (${sources.length} sources)`);

const createResult = await tools.createMemoryBank({
  name: BANK_NAME,
  description:
    'Ollama agent stack: home-agent, atlas-core, LSM, meridian-whisper, perplexica-mcp, memvid-mcp',
  sources,
  tags: ['ollama', 'mcp', 'home-agent', 'atlas', 'lsm', 'meridian', 'perplexica', 'memvid'],
});

if (!createResult.success) {
  console.error('CREATE FAILED:', createResult);
  await tools.shutdown();
  process.exit(1);
}

console.log('CREATE OK:', createResult.bank_name);

const verify = await tools.searchMemory({
  query: 'home-agent OpenJarvis MCP perplexica tools.mcp servers',
  memory_banks: [BANK_NAME],
  top_k: 3,
});

for (const r of verify.results ?? []) {
  console.log(`[${r.score?.toFixed(3)}] ${r.content?.slice(0, 160).replace(/\s+/g, ' ')}...`);
}

await tools.shutdown();
process.exit(0);
