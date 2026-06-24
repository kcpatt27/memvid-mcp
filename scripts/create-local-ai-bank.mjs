#!/usr/bin/env node
/**
 * Create local-ai-projects memory bank and run discovery searches.
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const projectRoot = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const personalProjects = path.resolve(projectRoot, '..');
const perplexicaRoot = path.join(personalProjects, 'perplexica-mcp');

process.env.PYTHON_EXECUTABLE =
  process.env.PYTHON_EXECUTABLE ||
  path.join(projectRoot, 'memvid-env', 'Scripts', 'python.exe');
process.env.PYTHON_EXECUTABLE = path.resolve(process.env.PYTHON_EXECUTABLE);
process.env.MEMVID_ALLOWED_PATHS = personalProjects;
process.env.MEMORY_BANKS_DIR = path.join(projectRoot, 'memory-banks');

const BANK_NAME = 'local-ai-projects';

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

const tools = new MemoryTools(config);
await tools.initialize();

console.log('Creating memory bank:', BANK_NAME);
console.log('Allowed roots include:', personalProjects);

const createResult = await tools.createMemoryBank({
  name: BANK_NAME,
  description: 'Local AI MCP projects: Perplexica MCP + MemVid MCP integration context',
  sources: [
    {
      type: 'directory',
      path: path.join(perplexicaRoot, 'memory-bank'),
      options: { file_types: ['md'] },
    },
    { type: 'file', path: path.join(perplexicaRoot, 'README.md') },
    { type: 'file', path: path.join(perplexicaRoot, 'ARCHITECTURE.md') },
    { type: 'file', path: path.join(perplexicaRoot, 'package.json') },
    { type: 'file', path: path.join(projectRoot, 'README.md') },
    { type: 'file', path: path.join(projectRoot, 'config', 'mcp.example.json') },
    { type: 'file', path: path.join(projectRoot, 'docs', 'SECURITY.md') },
  ],
  tags: ['local-ai', 'mcp', 'perplexica', 'memvid'],
});

if (!createResult.success) {
  console.error('CREATE FAILED:', createResult);
  await tools.shutdown();
  process.exit(1);
}

console.log('CREATE OK\n');

const queries = [
  'Perplexica MCP architecture Docker Ollama stdio',
  'MCP client configuration environment variables',
  'local AI search chat threads persistence',
  'memvid memory banks outside workspace allowed paths',
];

const allResults = {};

for (const query of queries) {
  const searchResult = await tools.searchMemory({
    query,
    memory_banks: [BANK_NAME],
    top_k: 5,
    min_score: 0.2,
  });
  allResults[query] = searchResult.results ?? [];
  console.log('--- QUERY:', query);
  for (const r of allResults[query].slice(0, 3)) {
    console.log(`[${r.score?.toFixed(3)}] ${r.content?.slice(0, 200).replace(/\s+/g, ' ')}...`);
  }
  console.log('');
}

const contextResult = await tools.getContext({
  query:
    'How should Perplexica MCP and MemVid MCP work together for a local AI assistant with personal knowledge outside the workspace?',
  memory_banks: [BANK_NAME],
  max_tokens: 4000,
  include_metadata: true,
});

console.log('=== GET_CONTEXT (sketch input) ===\n');
console.log(contextResult.context?.slice(0, 6000) ?? JSON.stringify(contextResult, null, 2));

await tools.shutdown();
process.exit(0);
