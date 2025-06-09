import * as fs from 'fs';
import * as path from 'path';
import { findCursorInstallation, createDirectoryIfNotExists, isWritable, resolveServerPath } from './platform-utils.js';

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPConfiguration {
  mcpServers: Record<string, MCPServerConfig>;
}

export function getCursorSettingsPath(): string | null {
  const cursorPath = findCursorInstallation();
  if (!cursorPath) {
    return null;
  }
  
  // MCP settings are typically stored in settings.json or a specific MCP config file
  const possiblePaths = [
    path.join(cursorPath, 'settings.json'),
    path.join(cursorPath, 'globalStorage', 'cursor.mcp-settings'),
    path.join(cursorPath, 'globalStorage', 'settings.json')
  ];
  
  // Check if any of these paths exist and are writable
  for (const settingsPath of possiblePaths) {
    if (fs.existsSync(settingsPath) && isWritable(path.dirname(settingsPath))) {
      return settingsPath;
    }
  }
  
  // If none exist, use the primary settings.json path
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
      // Return empty configuration if file doesn't exist
      return { mcpServers: {} };
    }
    
    const content = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(content);
    
    // Ensure mcpServers section exists
    if (!settings.mcpServers) {
      settings.mcpServers = {};
    }
    
    return settings as MCPConfiguration;
  } catch (error) {
    console.error(`Failed to read Cursor settings from ${settingsPath}:`, error);
    return null;
  }
}

export function writeCursorSettings(config: MCPConfiguration): boolean {
  const settingsPath = getCursorSettingsPath();
  if (!settingsPath) {
    return false;
  }
  
  try {
    // Create directory if it doesn't exist
    createDirectoryIfNotExists(path.dirname(settingsPath));
    
    // Write the configuration with pretty formatting
    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(settingsPath, content, 'utf8');
    
    return true;
  } catch (error) {
    console.error(`Failed to write Cursor settings to ${settingsPath}:`, error);
    return false;
  }
}

export function addMemvidMCPServer(): boolean {
  const config = readCursorSettings();
  if (!config) {
    console.error('Unable to read Cursor configuration');
    return false;
  }
  
  const serverPath = resolveServerPath();
  
  // Check if MemVid MCP server is already configured
  if (config.mcpServers.memvid) {
    console.log('MemVid MCP server is already configured in Cursor');
    
    // Update the configuration with current path
    config.mcpServers.memvid = {
      command: 'node',
      args: [serverPath]
    };
  } else {
    // Add new MemVid MCP server configuration
    config.mcpServers.memvid = {
      command: 'node',
      args: [serverPath]
    };
    
    console.log('Adding MemVid MCP server configuration to Cursor');
  }
  
  // Write the updated configuration
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
  
  return true; // Already not present
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