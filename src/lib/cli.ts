import { AutoSetup, SetupStatus } from './auto-setup.js';
import { logger } from './logger.js';

export class CLI {
  /**
   * Handle command line arguments and provide appropriate responses
   */
  static async handleArgs(args: string[]): Promise<boolean> {
    const command = args[2]; // node server.js <command>
    
    switch (command) {
      case '--help':
      case '-h':
        this.showHelp();
        return true;
        
      case '--version':
      case '-v':
        this.showVersion();
        return true;
        
      case '--setup':
      case '--check':
        await this.runSetupCheck();
        return true;
        
      case '--install':
        await this.runAutoInstall();
        return true;
        
      case '--config':
        this.showConfiguration();
        return true;
        
      default:
        // No CLI command, continue with MCP server startup
        return false;
    }
  }

  /**
   * Show help information
   */
  private static showHelp(): void {
    console.log(`
🧠 MemVid MCP Server - AI Memory Bank Management

USAGE:
  npx @kcpatt27/memvid-mcp-server [command]

COMMANDS:
  --help, -h        Show this help message
  --version, -v     Show version information
  --setup, --check  Check system setup and dependencies
  --install         Attempt automatic dependency installation
  --config          Show current configuration

SETUP:
  For first-time setup, run:
    npx @kcpatt27/memvid-mcp-server --setup

MCP CLIENT CONFIGURATION:
  Add to your MCP client (Cursor, Claude Desktop):
  
  {
    "mcpServers": {
      "memvid": {
        "command": "npx",
        "args": ["-y", "@kcpatt27/memvid-mcp-server"]
      }
    }
  }

DOCUMENTATION:
  📖 Full documentation: https://github.com/kcpatt27/memvid-mcp-server
  🐛 Issues: https://github.com/kcpatt27/memvid-mcp-server/issues
`);
  }

  /**
   * Show version information
   */
  private static showVersion(): void {
    // Read version from package.json
    const packageInfo = this.getPackageInfo();
    console.log(`
🧠 MemVid MCP Server v${packageInfo.version}

Dependencies:
  - Node.js: ${process.version}
  - Platform: ${process.platform}
  - Architecture: ${process.arch}

Repository: ${packageInfo.repository || 'https://github.com/kcpatt27/memvid-mcp-server'}
`);
  }

  /**
   * Run comprehensive setup check
   */
  private static async runSetupCheck(): Promise<void> {
    console.log('🔍 Checking MemVid MCP Server setup...\n');
    
    try {
      const status = await AutoSetup.detectSetup();
      this.displaySetupStatus(status);
      
      if (!status.isReady) {
        console.log('\n🔧 To fix issues automatically, run:');
        console.log('  npx @kcpatt27/memvid-mcp-server --install\n');
      }
    } catch (error) {
      console.error('❌ Setup check failed:', error);
      process.exit(1);
    }
  }

  /**
   * Attempt automatic installation of dependencies
   */
  private static async runAutoInstall(): Promise<void> {
    console.log('🚀 Starting automatic setup...\n');
    
    try {
      // Initial detection
      let status = await AutoSetup.detectSetup();
      console.log('📋 Current Status:');
      this.displaySetupStatus(status, false);
      
      if (status.isReady) {
        console.log('\n✅ System is already ready!');
        return;
      }

      // Attempt auto-fix
      console.log('\n🔧 Attempting to fix issues...');
      status = await AutoSetup.autoFix(status);
      
      console.log('\n📋 Updated Status:');
      this.displaySetupStatus(status);
      
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

  /**
   * Show current configuration
   */
  private static showConfiguration(): void {
    console.log('⚙️  MemVid MCP Server Configuration:\n');
    
    const config = {
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
    console.log('        "args": ["-y", "@kcpatt27/memvid-mcp-server"],');
    console.log('        "env": {');
    console.log('          "MEMORY_BANKS_DIR": "/custom/path",');
    console.log('          "PYTHON_EXECUTABLE": "python3"');
    console.log('        }');
    console.log('      }');
    console.log('    }');
    console.log('  }\n');
  }

  /**
   * Display setup status in a user-friendly format
   */
  private static displaySetupStatus(status: SetupStatus, showRecommendations: boolean = true): void {
    // System Overview
    console.log('📊 System Status:');
    console.log(`  Overall Ready: ${status.isReady ? '✅ Yes' : '❌ No'}`);
    
    // Python Status
    if (status.pythonPath) {
      console.log(`  Python: ✅ ${status.pythonVersion} (${status.pythonPath})`);
    } else {
      console.log('  Python: ❌ Not found');
    }
    
    // MemVid Status
    if (status.memvidInstalled) {
      console.log(`  MemVid: ✅ v${status.memvidVersion}`);
    } else {
      console.log('  MemVid: ❌ Not installed');
    }
    
    // Issues
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
    
    // Recommendations
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

  /**
   * Get package information
   */
  private static getPackageInfo(): any {
    try {
      // Try to read package.json from multiple locations
      const fs = require('fs');
      const path = require('path');
      const { fileURLToPath } = require('url');
      
      // Try relative to this file first
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      let packagePath = path.resolve(__dirname, '../../package.json');
      if (!fs.existsSync(packagePath)) {
        // Try relative to cwd
        packagePath = path.resolve(process.cwd(), 'package.json');
      }
      
      if (fs.existsSync(packagePath)) {
        return JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      }
    } catch (error) {
      // Ignore error and use defaults
    }
    
    return {
      version: '1.0.0',
      repository: 'https://github.com/kcpatt27/memvid-mcp-server'
    };
  }

  /**
   * Show startup banner with setup status
   */
  static async showStartupBanner(): Promise<void> {
    const packageInfo = this.getPackageInfo();
    console.log(`🧠 MemVid MCP Server v${packageInfo.version} starting...`);
    
    try {
      const status = await AutoSetup.detectSetup();
      
      if (status.isReady) {
        console.log('✅ System ready - All dependencies available');
        if (status.pythonVersion && status.memvidVersion) {
          console.log(`📋 Python ${status.pythonVersion}, MemVid v${status.memvidVersion}`);
        }
      } else {
        console.log('⚠️  Setup issues detected - Some features may not work');
        console.log('🔧 Run --setup for detailed diagnostics');
        
        // Log critical issues
        const criticalIssues = status.issues.filter(i => i.severity === 'error');
        for (const issue of criticalIssues) {
          logger.error(`${issue.component}: ${issue.message}`);
        }
      }
    } catch (error) {
      console.log('⚠️  Unable to verify setup - Proceeding with startup');
      logger.warn('Setup detection failed:', error);
    }
    
    console.log('🚀 Starting MCP server...\n');
  }
} 