#!/usr/bin/env node

import { AutoSetup, SetupStatus } from './lib/auto-setup.js';
import { logger } from './lib/logger.js';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { 
  detectPlatform, 
  findCursorInstallation, 
  getPackageInstallPath 
} from './lib/platform-utils.js';
import { 
  addMemvidMCPServer, 
  isMemvidMCPConfigured, 
  backupCursorSettings,
  getCursorSettingsPath,
  buildMemvidServerConfig,
} from './lib/cursor-config.js';

// Get package info for version display
function getPackageInfo(): any {
  try {
    const packagePath = getPackageInstallPath();
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    }
  } catch (error) {
    // Ignore error and use defaults
  }
  
  return {
    version: '1.1.15',
    repository: 'https://github.com/kcpatt27/memvid-mcp'
  };
}

function printHeader() {
  const packageInfo = getPackageInfo();
  console.log(`🧠 MemVid MCP Server v${packageInfo.version}`);
  console.log('=======================================');
  console.log('AI Memory Bank Management with Enhanced Search\n');
}

function showHelp() {
  printHeader();
  console.log('USAGE:');
  console.log('  npx @kcpatt27/memvid-mcp [command]');
  console.log('');
  console.log('COMMANDS:');
  console.log('  (no command)          Setup Cursor configuration');
  console.log('  --help, -h           Show this help message');
  console.log('  --version, -v        Show version information');
  console.log('  --setup, --check     Check system setup and dependencies');
  console.log('  --install            Attempt automatic dependency installation');
  console.log('  --config             Show current configuration');
  console.log('  --server             Run the MCP server directly');
  console.log('');
  console.log('SETUP:');
  console.log('  For first-time setup, run:');
  console.log('    npx @kcpatt27/memvid-mcp');
  console.log('');
  console.log('MCP CLIENT CONFIGURATION:');
  console.log('  {');
  console.log('    "mcpServers": {');
  console.log('      "memvid": {');
  console.log('        "command": "npx",');
  console.log('        "args": ["-y", "@kcpatt27/memvid-mcp", "--server"]');
  console.log('      }');
  console.log('    }');
  console.log('  }');
  console.log('');
  console.log('DOCUMENTATION:');
  console.log('  📖 Full documentation: https://github.com/kcpatt27/memvid-mcp');
  console.log('  🐛 Issues: https://github.com/kcpatt27/memvid-mcp/issues');
}

function showVersion() {
  const packageInfo = getPackageInfo();
  console.log(`MemVid MCP Server v${packageInfo.version}`);
  console.log(`Node.js: ${process.version}`);
  console.log(`Platform: ${process.platform} (${process.arch})`);
  console.log(`Repository: ${typeof packageInfo.repository === 'string' ? packageInfo.repository : packageInfo.repository?.url || 'https://github.com/kcpatt27/memvid-mcp'}`);
}

async function runSetupCheck() {
  console.log('🔍 Checking MemVid MCP Server setup...\n');
  
  try {
    const status = await AutoSetup.detectSetup();
    displaySetupStatus(status);
    
    if (!status.isReady) {
      console.log('\n🔧 To fix issues automatically, run:');
      console.log('  npx @kcpatt27/memvid-mcp --install\n');
    }
  } catch (error) {
    console.error('❌ Setup check failed:', error);
    process.exit(1);
  }
}

async function runAutoInstall() {
  console.log('🚀 Starting automatic setup...\n');
  
  try {
    let status = await AutoSetup.detectSetup();
    console.log('📋 Current Status:');
    displaySetupStatus(status, false);
    
    if (status.isReady) {
      console.log('\n✅ System is already ready!');
      return;
    }

    console.log('\n🔧 Attempting to fix issues...');
    status = await AutoSetup.autoFix(status);
    
    console.log('\n📋 Updated Status:');
    displaySetupStatus(status);
    
    if (status.isReady) {
      console.log('\n🎉 Setup completed successfully!');
      console.log('You can now use MemVid MCP Server in your MCP client.');
    } else {
      console.log('\n⚠️  Some issues require manual intervention.');
      console.log('Please follow the recommendations above.');
    }
  } catch (error) {
    console.error('❌ Auto-install failed:', error);
    process.exit(1);
  }
}

function showConfiguration() {
  console.log('⚙️  MemVid MCP Server Configuration:\n');
  
  const config = {
    'Package Version': getPackageInfo().version,
    'Installation Path': getPackageInstallPath(),
    'Memory Banks Directory': process.env.MEMORY_BANKS_DIR || '(auto-detected)',
    'Python Executable': process.env.PYTHON_EXECUTABLE || '(auto-detected)',
    'Config Path': process.env.MEMVID_CONFIG_PATH || '(default)',
    'Log Level': process.env.LOG_LEVEL || 'info',
    'Node.js Version': process.version,
    'Platform': `${process.platform} (${process.arch})`
  };

  for (const [key, value] of Object.entries(config)) {
    console.log(`  ${key.padEnd(25)}: ${value}`);
  }
  
  console.log('\n📝 To customize configuration:');
  console.log('  Set environment variables in your MCP client config');
  console.log('  Example:');
  console.log('  {');
  console.log('    "mcpServers": {');
  console.log('      "memvid": {');
  console.log('        "command": "npx",');
  console.log('        "args": ["-y", "@kcpatt27/memvid-mcp", "--server"],');
  console.log('        "env": {');
  console.log('          "MEMORY_BANKS_DIR": "/custom/path",');
  console.log('          "PYTHON_EXECUTABLE": "python3"');
  console.log('        }');
  console.log('      }');
  console.log('    }');
  console.log('\n📝 Example ~/.cursor/mcp.json entry (see config/mcp.example.json):');
  const example = buildMemvidServerConfig();
  console.log(JSON.stringify({ mcpServers: { memvid: example } }, null, 2));
  console.log('');
}

function displaySetupStatus(status: SetupStatus, showRecommendations: boolean = true) {
  console.log('📊 System Status:');
  console.log(`  Overall Ready: ${status.isReady ? '✅ Yes' : '❌ No'}`);
  
  if (status.pythonPath) {
    console.log(`  Python: ✅ ${status.pythonVersion} (${status.pythonPath})`);
  } else {
    console.log('  Python: ❌ Not found');
  }
  
  if (status.memvidInstalled) {
    console.log(`  MemVid: ✅ v${status.memvidVersion}`);
  } else {
    console.log('  MemVid: ❌ Not installed');
  }
  
  if (status.issues.length > 0) {
    console.log('\n🚨 Issues Found:');
    for (const issue of status.issues) {
      const icon = issue.severity === 'error' ? '❌' : 
                  issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${icon} ${issue.component}: ${issue.message}`);
      console.log(`     💡 ${issue.solution}`);
      if (issue.autoFixable) {
        console.log('     🔧 Auto-fixable');
      }
      console.log('');
    }
  }
  
  if (showRecommendations && status.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    for (const rec of status.recommendations) {
      if (rec.trim()) {
        console.log(`  ${rec}`);
      } else {
        console.log('');
      }
    }
  }
}

async function setupCursorConfiguration(): Promise<boolean> {
  const settingsPath = getCursorSettingsPath();
  if (!settingsPath) {
    console.error('❌ Unable to create Cursor MCP config (~/.cursor/mcp.json)');
    return false;
  }

  console.log('🔍 Configuring Cursor MCP...');
  console.log(`   Config file: ${settingsPath}`);

  const platform = detectPlatform();
  console.log(`   Platform: ${platform.platform}`);

  const cursorPath = findCursorInstallation();
  if (cursorPath) {
    console.log(`   Cursor found: ${cursorPath}`);
  }

  const setup = await AutoSetup.detectSetup();

  if (isMemvidMCPConfigured()) {
    console.log('✅ MemVid MCP server is already configured — updating entry');
  } else {
    console.log('📝 Adding MemVid MCP server to Cursor configuration...');
  }
  
  const backupPath = backupCursorSettings();
  if (backupPath) {
    console.log(`   Backup created: ${backupPath}`);
  }
  
  const memvidOptions = setup.pythonPath ? { pythonPath: setup.pythonPath } : undefined;
  const success = addMemvidMCPServer(memvidOptions);
  
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
    if (!setup.isReady) {
      console.log('\n⚠️  Setup detected issues — run: npx @kcpatt27/memvid-mcp --check');
    }
    return true;
  } else {
    console.error('❌ Failed to configure Cursor');
    console.log('\nManual configuration — add to ~/.cursor/mcp.json:');
    const example = buildMemvidServerConfig(memvidOptions);
    console.log(JSON.stringify({ mcpServers: { memvid: example } }, null, 2));
    return false;
  }
}

function runServer() {
  // Import and start the MCP server
  const packagePath = getPackageInstallPath();
  const serverPath = path.join(packagePath, 'dist', 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.error(`❌ Server file not found: ${serverPath}`);
    process.exit(1);
  }
  
  // Start the server directly
  const serverProcess = spawn('node', [serverPath, '--mcp'], {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    serverProcess.kill('SIGTERM');
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  // Handle command line arguments
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    return;
  }
  
  if (args.includes('--setup') || args.includes('--check')) {
    await runSetupCheck();
    return;
  }
  
  if (args.includes('--install')) {
    await runAutoInstall();
    return;
  }
  
  if (args.includes('--config')) {
    showConfiguration();
    return;
  }
  
  if (args.includes('--server')) {
    runServer();
    return;
  }
  
  // Default behavior: setup Cursor configuration
  printHeader();
  
  console.log('🔧 Checking environment...');
  const envCheck = { success: true, issues: [] as string[] };
  
  // Quick Node.js version check
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0] || '0');
  if (majorVersion < 18) {
    envCheck.success = false;
    envCheck.issues.push(`Node.js 18+ required (current: ${nodeVersion})`);
  }
  
  if (!envCheck.success) {
    console.error('❌ Environment issues found:');
    envCheck.issues.forEach(issue => console.error(`   - ${issue}`));
    process.exit(1);
  }
  
  console.log('✅ Environment check passed');
  
  const success = await setupCursorConfiguration();
  process.exit(success ? 0 : 1);
}

// Run the CLI
main().catch((error) => {
  console.error('❌ CLI failed:', error);
  process.exit(1);
}); 