import { existsSync, realpathSync } from 'fs';
import path from 'path';

function resolveRoot(candidate: string): string {
  try {
    return existsSync(candidate) ? realpathSync(candidate) : path.resolve(candidate);
  } catch {
    return path.resolve(candidate);
  }
}

/**
 * Roots under which file/directory sources may be read.
 * Includes memory banks dir, server install dir, MEMVID_WORKSPACE_ROOT, and MEMVID_ALLOWED_PATHS.
 */
export function getAllowedPathRoots(memoryBanksDir: string, serverDir: string): string[] {
  const roots = new Set<string>();

  const addRoot = (candidate: string | undefined) => {
    if (!candidate?.trim()) return;
    roots.add(resolveRoot(candidate.trim()));
  };

  addRoot(memoryBanksDir);
  addRoot(serverDir);
  addRoot(process.env.MEMVID_WORKSPACE_ROOT);

  const extra = process.env.MEMVID_ALLOWED_PATHS;
  if (extra) {
    for (const entry of extra.split(path.delimiter)) {
      addRoot(entry);
    }
  }

  return [...roots];
}

export function formatAllowedPathsForEnv(roots: string[]): string {
  return roots.join(path.delimiter);
}

export function isPathWithinRoots(targetPath: string, roots: string[]): boolean {
  if (roots.length === 0) {
    return false;
  }

  let canonical: string;
  try {
    canonical = existsSync(targetPath) ? realpathSync(targetPath) : path.resolve(targetPath);
  } catch {
    canonical = path.resolve(targetPath);
  }

  for (const root of roots) {
    const rootResolved = resolveRoot(root);
    const prefix = rootResolved.endsWith(path.sep) ? rootResolved : rootResolved + path.sep;
    if (canonical === rootResolved || canonical.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

export function assertAllowedSourcePath(sourcePath: string, roots: string[]): void {
  if (!isPathWithinRoots(sourcePath, roots)) {
    throw new Error(
      `Path not allowed: ${sourcePath}. Allowed roots: workspace, memory banks, MEMVID_WORKSPACE_ROOT, or MEMVID_ALLOWED_PATHS.`
    );
  }
}

export function isUrlSourcesEnabled(): boolean {
  const value = process.env.MEMVID_ALLOW_URL_SOURCES?.toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}
