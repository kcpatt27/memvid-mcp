#!/usr/bin/env node
/**
 * Security regression: bank name validation rejects path traversal.
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const { MemoryBankNameSchema } = await import(
  pathToFileURL(path.join(projectRoot, 'dist/lib/bank-name.js')).href
);
const { resolveBankFilePath } = await import(
  pathToFileURL(path.join(projectRoot, 'dist/lib/bank-name.js')).href
);

const invalidNames = ['../evil', '..\\evil', 'foo/bar', 'foo\\bar', '', 'a'.repeat(65)];
let failed = 0;

for (const name of invalidNames) {
  const result = MemoryBankNameSchema.safeParse(name);
  if (result.success) {
    console.error(`FAIL: should reject bank name: ${JSON.stringify(name)}`);
    failed++;
  }
}

const valid = MemoryBankNameSchema.safeParse('smoke-test-123');
if (!valid.success) {
  console.error('FAIL: should accept valid bank name smoke-test-123');
  failed++;
}

try {
  resolveBankFilePath(projectRoot, '../evil', 'mp4');
  console.error('FAIL: resolveBankFilePath should throw for traversal name');
  failed++;
} catch {
  // expected
}

if (failed > 0) {
  process.exit(1);
}

console.log('Bank name security checks passed.');
process.exit(0);
