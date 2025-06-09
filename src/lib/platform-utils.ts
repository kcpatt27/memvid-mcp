import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

export interface PlatformInfo {
  platform: 'windows' | 'macos' | 'linux';
  cursorConfigPath: string;
  homeDir: string;
}

export function detectPlatform(): PlatformInfo {
  const platform = os.platform();
  const homeDir = os.homedir();
  
  let cursorConfigPath: string;
  let detectedPlatform: 'windows' | 'macos' | 'linux';
  
  switch (platform) {
    case 'win32':
      detectedPlatform = 'windows';
      cursorConfigPath = path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'User');
      break;
    case 'darwin':
      detectedPlatform = 'macos';
      cursorConfigPath = path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User');
      break;
    default: // linux and others
      detectedPlatform = 'linux';
      cursorConfigPath = path.join(homeDir, '.config', 'Cursor', 'User');
      break;
  }
  
  return {
    platform: detectedPlatform,
    cursorConfigPath,
    homeDir
  };
}

export function findCursorInstallation(): string | null {
  const platformInfo = detectPlatform();
  
  // Check if Cursor config directory exists
  if (fs.existsSync(platformInfo.cursorConfigPath)) {
    return platformInfo.cursorConfigPath;
  }
  
  // Alternative locations for Cursor
  const alternativePaths = [];
  
  switch (platformInfo.platform) {
    case 'windows':
      alternativePaths.push(
        path.join(platformInfo.homeDir, 'AppData', 'Local', 'Cursor', 'User'),
        path.join('C:', 'Users', 'Default', 'AppData', 'Roaming', 'Cursor', 'User')
      );
      break;
    case 'macos':
      alternativePaths.push(
        path.join('/Applications', 'Cursor.app'),
        path.join(platformInfo.homeDir, 'Applications', 'Cursor.app')
      );
      break;
    case 'linux':
      alternativePaths.push(
        path.join('/opt', 'cursor'),
        path.join('/usr', 'local', 'bin', 'cursor'),
        path.join(platformInfo.homeDir, '.local', 'share', 'Cursor', 'User')
      );
      break;
  }
  
  for (const altPath of alternativePaths) {
    if (fs.existsSync(altPath)) {
      return altPath;
    }
  }
  
  return null;
}

export function getPackageInstallPath(): string {
  // Get the path where this NPM package is installed
  // For ES modules, we need to use import.meta.url instead of __dirname
  const currentFileUrl = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileUrl);
  const packagePath = path.dirname(path.dirname(path.dirname(currentFilePath)));
  return packagePath;
}

export function resolveServerPath(): string {
  // Get the absolute path to the compiled server.js
  const packagePath = getPackageInstallPath();
  return path.join(packagePath, 'dist', 'server.js');
}

export function createDirectoryIfNotExists(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error);
    return false;
  }
}

export function isWritable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
} 