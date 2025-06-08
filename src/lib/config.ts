import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { logger } from './logger.js';

interface EnvironmentConfig {
  memoryBanksDir: string;
  pythonExecutable: string;
  configDir: string;
  isPortable: boolean;
}

export class ConfigManager {
  private static instance: ConfigManager;
  private environmentConfig: EnvironmentConfig | null = null;

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async getEnvironmentConfig(): Promise<EnvironmentConfig> {
    if (this.environmentConfig) {
      return this.environmentConfig;
    }

    this.environmentConfig = await this.detectEnvironment();
    return this.environmentConfig;
  }

  private async detectEnvironment(): Promise<EnvironmentConfig> {
    // Check if running as npm package (npx)
    const isNpxRun = Boolean(process.env.npm_config_user_config) || 
                     Boolean(process.argv[0]?.includes('npx'));

    // Default directories based on platform
    const userDataDir = this.getUserDataDirectory();
    const configDir = path.join(userDataDir, 'memvid-mcp');
    const memoryBanksDir = path.join(configDir, 'memory-banks');

    // Ensure directories exist
    await this.ensureDirectoryExists(configDir);
    await this.ensureDirectoryExists(memoryBanksDir);

    // Detect Python installation
    const pythonExecutable = await this.detectPython();

    const config: EnvironmentConfig = {
      memoryBanksDir: process.env.MEMORY_BANKS_DIR || memoryBanksDir,
      pythonExecutable: process.env.PYTHON_EXECUTABLE || pythonExecutable,
      configDir,
      isPortable: isNpxRun
    };

    logger.info('Environment configuration detected:', {
      isPortable: config.isPortable,
      memoryBanksDir: config.memoryBanksDir,
      pythonExecutable: config.pythonExecutable
    });

    return config;
  }

  private getUserDataDirectory(): string {
    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support');
      case 'linux':
      default:
        return process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
      logger.info(`Created directory: ${dirPath}`);
    }
  }

  private async detectPython(): Promise<string> {
    const candidates = [
      'python3',
      'python',
      'py'
    ];

    for (const candidate of candidates) {
      try {
        const { spawn } = require('child_process');
        
        await new Promise<void>((resolve, reject) => {
          const proc = spawn(candidate, ['--version'], { stdio: 'pipe' });
          proc.on('close', (code: number | null) => code === 0 ? resolve() : reject(new Error(`Process exited with code ${code}`)));
          proc.on('error', reject);
        });

        logger.info(`Python detected: ${candidate}`);
        return candidate;
      } catch (error) {
        // Continue to next candidate
      }
    }

    // Fallback to 'python' and let the user handle installation
    logger.warn('Python not detected. Please ensure Python is installed and accessible.');
    return 'python';
  }

  async setupMemvidEnvironment(): Promise<void> {
    const config = await this.getEnvironmentConfig();
    
    // Check if MemVid is installed
    try {
      const { spawn } = require('child_process');
      
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(config.pythonExecutable, ['-c', 'import memvid'], { stdio: 'pipe' });
        proc.on('close', (code: number | null) => code === 0 ? resolve() : reject(new Error(`Process exited with code ${code}`)));
        proc.on('error', reject);
      });

      logger.info('MemVid installation verified');
    } catch (error) {
      logger.warn('MemVid not found. Please install with: pip install memvid');
      
      // Create setup instructions file
      const setupPath = path.join(config.configDir, 'SETUP.md');
      const setupInstructions = `# MemVid MCP Server Setup

## Prerequisites

1. **Install Python** (3.8 or higher)
   - Windows: Download from python.org
   - macOS: brew install python3
   - Linux: apt-get install python3

2. **Install MemVid**
   \`\`\`bash
   pip install memvid
   \`\`\`

## Configuration

Your memory banks are stored in:
\`${config.memoryBanksDir}\`

## Usage

Once setup is complete, restart your MCP client (Cursor/Claude) to use the MemVid server.
`;

      await fs.writeFile(setupPath, setupInstructions);
      logger.info(`Setup instructions created at: ${setupPath}`);
    }
  }
} 