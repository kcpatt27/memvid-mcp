import path from 'path';

/** Env vars safe to forward to the Python child process. */
const FORWARDED_ENV_KEYS = [
  'PATH',
  'PATHEXT',
  'SYSTEMROOT',
  'WINDIR',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'HOME',
  'APPDATA',
  'LOCALAPPDATA',
  'PROGRAMFILES',
  'PROGRAMFILES(X86)',
  'PYTHONPATH',
  'HF_HOME',
  'HUGGINGFACE_HUB_CACHE',
  'TRANSFORMERS_CACHE',
  'HF_TOKEN',
  'CUDA_VISIBLE_DEVICES',
  'OMP_NUM_THREADS',
  'MEMVID_ALLOW_URL_SOURCES',
  'MEMVID_WORKSPACE_ROOT',
  'LANG',
  'LC_ALL',
  'TZ',
] as const;

export interface PythonBridgeEnvOptions {
  memoryBanksDir: string;
  allowedPaths: string[];
}

/**
 * Build a minimal environment for the Python bridge (no full process.env inheritance).
 */
export function buildPythonBridgeEnv(options: PythonBridgeEnvOptions): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    PYTHONUNBUFFERED: '1',
    PYTHONIOENCODING: 'utf-8',
    PYTHONUTF8: '1',
    MEMORY_BANKS_DIR: options.memoryBanksDir,
    MEMVID_ALLOWED_PATHS: options.allowedPaths.join(path.delimiter),
  };

  if (process.env.MEMVID_ALLOW_URL_SOURCES) {
    env.MEMVID_ALLOW_URL_SOURCES = process.env.MEMVID_ALLOW_URL_SOURCES;
  }
  if (process.env.MEMVID_WORKSPACE_ROOT) {
    env.MEMVID_WORKSPACE_ROOT = process.env.MEMVID_WORKSPACE_ROOT;
  }

  for (const key of FORWARDED_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined && env[key] === undefined) {
      env[key] = value;
    }
  }

  return env;
}
