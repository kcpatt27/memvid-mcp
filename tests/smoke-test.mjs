#!/usr/bin/env node
/**
 * End-to-end smoke test: create memory bank from text, then search it.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(__dirname);

process.env.PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE ||
  path.join(projectRoot, 'memvid-env', 'Scripts', 'python.exe');

const memoryBanksDir = path.join(projectRoot, 'memory-banks');
const testBankName = `smoke-test-${Date.now()}`;

const { pathToFileURL } = await import('url');
const { MemoryTools } = await import(pathToFileURL(path.join(projectRoot, 'dist/tools/memory.js')).href);

const config = {
  memvid: {
    chunk_size: 512,
    overlap: 50,
    embedding_model: 'sentence-transformers/all-MiniLM-L6-v2'
  },
  storage: {
    memory_banks_dir: memoryBanksDir,
    max_file_size: '100MB',
    cleanup_temp_files: true
  },
  search: {
    default_top_k: 5,
    min_score_threshold: 0.3,
    max_context_tokens: 4000
  },
  performance: {
    cache_size: 100,
    parallel_processing: true,
    max_concurrent_searches: 5
  }
};

console.log('Smoke test: MemVid MCP create + search');
console.log(`Python: ${process.env.PYTHON_EXECUTABLE}`);
console.log(`Memory banks dir: ${memoryBanksDir}`);

const tools = new MemoryTools(config);
await tools.initialize();

const createResult = await tools.createMemoryBank({
  name: testBankName,
  description: 'Smoke test bank',
  sources: [{
    type: 'text',
    path: 'MemVid MCP smoke test content about semantic search and memory banks for AI assistants.'
  }],
  tags: ['smoke-test']
});

if (!createResult.success) {
  console.error('CREATE FAILED:', createResult);
  process.exit(1);
}

console.log('CREATE OK:', createResult.bank_name);

const mp4Path = path.join(memoryBanksDir, `${testBankName}.mp4`);
const jsonPath = path.join(memoryBanksDir, `${testBankName}.json`);
const faissPath = path.join(memoryBanksDir, `${testBankName}.faiss`);

for (const filePath of [mp4Path, jsonPath, faissPath]) {
  if (!existsSync(filePath)) {
    console.error(`Missing expected file: ${filePath}`);
    process.exit(1);
  }
  console.log(`File exists: ${filePath}`);
}

const searchResult = await tools.searchMemory({
  query: 'semantic search memory banks',
  memory_banks: [testBankName],
  top_k: 3
});

if (!searchResult.results || searchResult.results.length === 0) {
  console.error('SEARCH FAILED: no results', searchResult);
  process.exit(1);
}

console.log('SEARCH OK:', searchResult.results.length, 'result(s)');
console.log('First result preview:', searchResult.results[0].content?.slice(0, 120));

console.log('Smoke test passed.');

await tools.shutdown();
process.exit(0);
