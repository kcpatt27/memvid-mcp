#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { detectPlatform, findCursorInstallation, resolveServerPath } from './lib/platform-utils.js';
import { 
  addMemvidMCPServer, 
  isMemvidMCPConfigured, 
  backupCursorSettings,
  getCursorSettingsPath 
} from './lib/cursor-config.js';

const VERSION = '1.0.0';

function printHeader() {
  console.log('🎥 MemVid MCP Server Setup');
  console.log('===============================');
  console.log('Intelligent AI memory using MP4 files\n');
}

function printHelp() {
  printHeader();
  console.log('Usage:');
  console.log('  npx @kcpatt27/memvid-mcp-server          Setup Cursor configuration');
  console.log('  npx @kcpatt27/memvid-mcp-server --help   Show this help message');
  console.log('  npx @kcpatt27/memvid-mcp-server --server Run the server directly');
  console.log('  npx @kcpatt27/memvid-mcp-server --check  Check current configuration');
  console.log('  npx @kcpatt27/memvid-mcp-server --remove Remove from Cursor configuration');
  console.log('\nFor more information, visit: https://github.com/kcpatt27/memvid-mcp-server');
}

function checkEnvironment(): { success: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check Node.js version
  const nodeVersion = process.version;
  const versionParts = nodeVersion.slice(1).split('.');
  const majorVersionStr = versionParts[0];
  if (majorVersionStr) {
    const majorVersion = parseInt(majorVersionStr);
    if (majorVersion < 18) {
      issues.push(`Node.js 18+ required (current: ${nodeVersion})`);
    }
  }
  
  // Check if server file exists
  const serverPath = resolveServerPath();
  if (!fs.existsSync(serverPath)) {
    issues.push(`Server file not found: ${serverPath}`);
  }
  
  return {
    success: issues.length === 0,
    issues
  };
}

function checkPythonEnvironment(): Promise<{ success: boolean; issues: string[] }> {
  return new Promise((resolve) => {
    const issues: string[] = [];
    
    // Check if Python is available
    const pythonProcess = spawn('python', ['--version'], { stdio: 'pipe' });
    
    pythonProcess.on('error', () => {
      // Try python3
      const python3Process = spawn('python3', ['--version'], { stdio: 'pipe' });
      
      python3Process.on('error', () => {
        issues.push('Python 3.8+ not found. Please install Python from https://python.org');
        resolve({ success: false, issues });
      });
      
      python3Process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, issues });
        } else {
          issues.push('Python 3.8+ not found. Please install Python from https://python.org');
          resolve({ success: false, issues });
        }
      });
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, issues });
      } else {
        issues.push('Python 3.8+ not found. Please install Python from https://python.org');
        resolve({ success: false, issues });
      }
    });
  });
}

async function setupCursorConfiguration(): Promise<boolean> {
  console.log('🔍 Detecting platform and Cursor installation...');
  
  const platform = detectPlatform();
  console.log(`   Platform: ${platform.platform}`);
  
  const cursorPath = findCursorInstallation();
  if (!cursorPath) {
    console.error('❌ Cursor installation not found');
    console.log('\nPlease ensure Cursor is installed and try again.');
    console.log('Download Cursor from: https://cursor.sh');
    return false;
  }
  
  console.log(`   Cursor found: ${cursorPath}`);
  
  // Check if already configured
  if (isMemvidMCPConfigured()) {
    console.log('✅ MemVid MCP server is already configured in Cursor');
    console.log('   Updating configuration with current path...');
  } else {
    console.log('📝 Adding MemVid MCP server to Cursor configuration...');
  }
  
  // Create backup
  const backupPath = backupCursorSettings();
  if (backupPath) {
    console.log(`   Backup created: ${backupPath}`);
  }
  
  // Add configuration
  const success = addMemvidMCPServer();
  
  if (success) {
    console.log('✅ MemVid MCP server configured successfully!');
    console.log('\n🎉 Setup Complete!');
    console.log('\nNext steps:');
    console.log('1. Restart Cursor if it\'s currently running');
    console.log('2. Open a project in Cursor');
    console.log('3. Look for "memvid" in the MCP Tools section');
    console.log('4. Available tools: create_memory_bank, search_memory, list_memory_banks');
    console.log('\nCreate your first memory bank:');
    console.log('   Use "create_memory_bank" tool with your project files');
    return true;
  } else {
    console.error('❌ Failed to configure Cursor');
    console.log('\nManual configuration needed:');
    console.log('Add this to your Cursor settings.json:');
    console.log('```json');
    console.log(JSON.stringify({
      mcpServers: {
        memvid: {
          command: 'node',
          args: [resolveServerPath()]
        }
      }
    }, null, 2));
    console.log('```');
    return false;
  }
}

function checkConfiguration() {
  printHeader();
  console.log('🔍 Checking MemVid MCP configuration...\n');
  
  const platform = detectPlatform();
  console.log(`Platform: ${platform.platform}`);
  
  const cursorPath = findCursorInstallation();
  if (cursorPath) {
    console.log(`Cursor installation: ${cursorPath}`);
  } else {
    console.log('Cursor installation: ❌ Not found');
  }
  
  const settingsPath = getCursorSettingsPath();
  if (settingsPath) {
    console.log(`Settings file: ${settingsPath}`);
  } else {
    console.log('Settings file: ❌ Not accessible');
  }
  
  const isConfigured = isMemvidMCPConfigured();
  console.log(`MCP configuration: ${isConfigured ? '✅ Configured' : '❌ Not configured'}`);
  
  const serverPath = resolveServerPath();
  console.log(`Server path: ${serverPath}`);
  console.log(`Server exists: ${fs.existsSync(serverPath) ? '✅ Yes' : '❌ No'}`);
}

function runServer() {
  console.log('🚀 Starting MemVid MCP server...');
  const serverPath = resolveServerPath();
  
  if (!fs.existsSync(serverPath)) {
    console.error(`❌ Server file not found: ${serverPath}`);
    process.exit(1);
  }
  
  // Start the server
  const serverProcess = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code || 0);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill('SIGTERM');
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  // Handle command line arguments
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`MemVid MCP Server v${VERSION}`);
    return;
  }
  
  if (args.includes('--check')) {
    checkConfiguration();
    return;
  }
  
  if (args.includes('--server')) {
    runServer();
    return;
  }
  
  if (args.includes('--remove')) {
    // TODO: Implement removal functionality
    console.log('Remove functionality coming soon...');
    return;
  }
  
  // Default behavior: setup
  printHeader();
  
  console.log('🔧 Checking environment...');
  const envCheck = checkEnvironment();
  if (!envCheck.success) {
    console.error('❌ Environment issues found:');
    envCheck.issues.forEach(issue => console.error(`   - ${issue}`));
    process.exit(1);
  }
  console.log('✅ Environment check passed');
  
  console.log('🐍 Checking Python environment...');
  const pythonCheck = await checkPythonEnvironment();
  if (!pythonCheck.success) {
    console.warn('⚠️  Python environment issues:');
    pythonCheck.issues.forEach(issue => console.warn(`   - ${issue}`));
    console.log('   Note: MemVid will attempt to install Python dependencies automatically');
  } else {
    console.log('✅ Python environment check passed');
  }
  
  const success = await setupCursorConfiguration();
  process.exit(success ? 0 : 1);
}

// Run the setup
main().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
}); 