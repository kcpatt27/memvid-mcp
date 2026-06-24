import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findCursorInstallation, createDirectoryIfNotExists, isWritable, resolveServerPath, getPackageInstallPath } from './platform-utils.js';

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface MCPConfiguration {
  mcpServers: Record<string, MCPServerConfig>;
}

/** Modern Cursor global MCP config (~/.cursor/mcp.json). */
export function getCursorMcpConfigPath(): string {
  return path.join(os.homedir(), '.cursor', 'mcp.json');
}

export function getCursorSettingsPath(): string | null {
  const mcpPath = getCursorMcpConfigPath();
  if (createDirectoryIfNotExists(path.dirname(mcpPath)) && isWritable(path.dirname(mcpPath))) {
    return mcpPath;
  }

  // Legacy fallback: Cursor User settings.json
  const cursorPath = findCursorInstallation();
  if (!cursorPath) {
    return null;
  }

  const legacyPaths = [
    path.join(cursorPath, 'settings.json'),
    path.join(cursorPath, 'globalStorage', 'cursor.mcp-settings'),
    path.join(cursorPath, 'globalStorage', 'settings.json'),
  ];

  for (const settingsPath of legacyPaths) {
    if (fs.existsSync(settingsPath) && isWritable(path.dirname(settingsPath))) {
      return settingsPath;
    }
  }

  const primaryPath = path.join(cursorPath, 'settings.json');
  if (createDirectoryIfNotExists(path.dirname(primaryPath))) {
    return primaryPath;
  }

  return null;
}

export function readCursorSettings(): MCPConfiguration | null {
  const settingsPath = getCursorSettingsPath();
  if (!settingsPath) {
    return null;
  }

  try {
    if (!fs.existsSync(settingsPath)) {
      return { mcpServers: {} };
    }

    const content = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(content);

    if (!settings.mcpServers) {
      settings.mcpServers = {};
    }

    return settings as MCPConfiguration;
  } catch (error) {
    console.error(`Failed to read Cursor MCP config from ${settingsPath}:`, error);
    return null;
  }
}

export function writeCursorSettings(config: MCPConfiguration): boolean {
  const settingsPath = getCursorSettingsPath();
  if (!settingsPath) {
    return false;
  }

  try {
    createDirectoryIfNotExists(path.dirname(settingsPath));
    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(settingsPath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Failed to write Cursor MCP config to ${settingsPath}:`, error);
    return false;
  }
}

export function buildMemvidServerConfig(options?: { pythonPath?: string }): MCPServerConfig {
  const packagePath = getPackageInstallPath();
  const serverPath = resolveServerPath();
  const memoryBanksDir = process.env.MEMORY_BANKS_DIR || path.join(packagePath, 'memory-banks');

  const env: Record<string, string> = {
    MEMORY_BANKS_DIR: memoryBanksDir,
    MEMVID_WORKSPACE_ROOT: packagePath,
    PYTHONIOENCODING: 'utf-8',
    PYTHONUTF8: '1',
  };

  const pythonPath = options?.pythonPath || process.env.PYTHON_EXECUTABLE;
  if (pythonPath) {
    env.PYTHON_EXECUTABLE = path.isAbsolute(pythonPath)
      ? pythonPath
      : path.resolve(packagePath, pythonPath);
  }

  if (fs.existsSync(serverPath)) {
    return {
      command: process.execPath,
      args: [serverPath, '--mcp'],
      env,
    };
  }

  return {
    command: 'npx',
    args: ['-y', '@kcpatt27/memvid-mcp', '--server'],
    env,
  };
}

export function addMemvidMCPServer(options?: { pythonPath?: string }): boolean {
  const config = readCursorSettings();
  if (!config) {
    console.error('Unable to read Cursor MCP configuration');
    return false;
  }

  const serverConfig = buildMemvidServerConfig(options);

  if (config.mcpServers.memvid) {
    console.log('MemVid MCP server is already configured — updating entry');
  } else {
    console.log('Adding MemVid MCP server to Cursor MCP configuration');
  }

  config.mcpServers.memvid = serverConfig;
  return writeCursorSettings(config);
}

export function removeMemvidMCPServer(): boolean {
  const config = readCursorSettings();
  if (!config) {
    return false;
  }

  if (config.mcpServers.memvid) {
    delete config.mcpServers.memvid;
    return writeCursorSettings(config);
  }

  return true;
}

export function isMemvidMCPConfigured(): boolean {
  const config = readCursorSettings();
  return config ? !!config.mcpServers.memvid : false;
}

export function backupCursorSettings(): string | null {
  const settingsPath = getCursorSettingsPath();
  if (!settingsPath || !fs.existsSync(settingsPath)) {
    return null;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${settingsPath}.backup-${timestamp}`;
    fs.copyFileSync(settingsPath, backupPath);
    return backupPath;
  } catch (error) {
    console.error('Failed to create backup:', error);
    return null;
  }
}

export function restoreCursorSettings(backupPath: string): boolean {
  const settingsPath = getCursorSettingsPath();
  if (!settingsPath) {
    return false;
  }

  try {
    fs.copyFileSync(backupPath, settingsPath);
    return true;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return false;
  }
}
