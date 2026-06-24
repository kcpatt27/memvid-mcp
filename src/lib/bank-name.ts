import path from 'path';
import { z } from 'zod';

/** Safe memory bank name: alphanumeric, underscore, hyphen; 1–64 chars. */
export const MEMORY_BANK_NAME_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export const MemoryBankNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    MEMORY_BANK_NAME_REGEX,
    'Bank name must be 1–64 characters and contain only letters, numbers, underscores, and hyphens'
  );

export function assertValidBankName(name: string): void {
  const result = MemoryBankNameSchema.safeParse(name);
  if (!result.success) {
    throw new Error(result.error.errors[0]?.message ?? 'Invalid memory bank name');
  }
}

/**
 * Resolve a bank file path and ensure it stays inside memoryBanksDir.
 */
export function resolveBankFilePath(memoryBanksDir: string, name: string, extension: string): string {
  assertValidBankName(name);
  const resolvedDir = path.resolve(memoryBanksDir);
  const resolvedPath = path.resolve(resolvedDir, `${name}.${extension}`);
  const dirPrefix = resolvedDir.endsWith(path.sep) ? resolvedDir : resolvedDir + path.sep;
  if (resolvedPath !== resolvedDir && !resolvedPath.startsWith(dirPrefix)) {
    throw new Error(`Invalid memory bank name: path escapes storage directory`);
  }
  return resolvedPath;
}
