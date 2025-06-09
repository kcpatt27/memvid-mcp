import { spawn, execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export interface SetupStatus {
  isReady: boolean;
  pythonPath?: string;
  pythonVersion?: string;
  memvidInstalled: boolean;
  memvidVersion?: string;
  issues: SetupIssue[];
  recommendations: string[];
}

export interface SetupIssue {
  severity: 'error' | 'warning' | 'info';
  component: 'python' | 'memvid' | 'permissions' | 'environment';
  message: string;
  solution: string;
  autoFixable: boolean;
}

export class AutoSetup {
  private static readonly PYTHON_COMMANDS = ['python', 'python3', 'py'];
  private static readonly MIN_PYTHON_VERSION = [3, 8];

  /**
   * Comprehensive system setup detection
   */
  static async detectSetup(): Promise<SetupStatus> {
    const status: SetupStatus = {
      isReady: false,
      memvidInstalled: false,
      issues: [],
      recommendations: []
    };

    // 1. Detect Python installation
    await this.detectPython(status);

    // 2. Check MemVid installation (only if Python is available)
    if (status.pythonPath) {
      await this.detectMemvid(status);
    }

    // 3. Check directory permissions
    await this.checkPermissions(status);

    // 4. Generate recommendations
    this.generateRecommendations(status);

    // 5. Determine overall readiness
    status.isReady = status.issues.filter(i => i.severity === 'error').length === 0;

    return status;
  }

  /**
   * Auto-detect Python installation and version
   */
  private static async detectPython(status: SetupStatus): Promise<void> {
    // Check environment variable first
    const envPython = process.env.PYTHON_EXECUTABLE;
    if (envPython) {
      const pythonValid = await this.validatePython(envPython);
      if (pythonValid) {
        status.pythonPath = envPython;
        const version = await this.getPythonVersion(envPython);
        if (version) status.pythonVersion = version;
        return;
      }
    }

    // Try common Python commands
    for (const cmd of this.PYTHON_COMMANDS) {
      try {
        const pythonValid = await this.validatePython(cmd);
        if (pythonValid) {
          status.pythonPath = cmd;
          const version = await this.getPythonVersion(cmd);
          if (version) status.pythonVersion = version;
          return;
        }
      } catch (error) {
        // Continue to next command
      }
    }

    // Python not found
    status.issues.push({
      severity: 'error',
      component: 'python',
      message: 'Python 3.8+ not found in system PATH',
      solution: this.getPythonInstallInstructions(),
      autoFixable: false
    });
  }

  /**
   * Validate Python installation and version
   */
  private static async validatePython(pythonCmd: string): Promise<boolean> {
    try {
      const version = await this.getPythonVersion(pythonCmd);
      if (!version) return false;

      const versionParts = version.split('.').map(Number);
      const [major, minor] = versionParts;

      if (major === undefined || minor === undefined || 
          isNaN(major) || isNaN(minor)) return false;

      return major >= this.MIN_PYTHON_VERSION[0]! && 
             (major > this.MIN_PYTHON_VERSION[0]! || minor >= this.MIN_PYTHON_VERSION[1]!);
    } catch {
      return false;
    }
  }

  /**
   * Get Python version string
   */
  private static async getPythonVersion(pythonCmd: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      const process = spawn(pythonCmd, ['--version'], { stdio: 'pipe' });
      let output = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          const match = output.match(/Python\s+(\d+\.\d+\.\d+)/);
          resolve(match?.[1]);
        } else {
          resolve(undefined);
        }
      });

      process.on('error', () => {
        resolve(undefined);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        process.kill();
        resolve(undefined);
      }, 5000);
    });
  }

  /**
   * Check if MemVid is installed and get version
   */
  private static async detectMemvid(status: SetupStatus): Promise<void> {
    if (!status.pythonPath) return;

    try {
      const checkScript = `
import sys
try:
    import memvid
    print(f"MEMVID_VERSION:{memvid.__version__}")
    print("MEMVID_INSTALLED:true")
except ImportError as e:
    print(f"MEMVID_ERROR:{str(e)}")
    print("MEMVID_INSTALLED:false")
except Exception as e:
    print(f"MEMVID_ERROR:{str(e)}")
    print("MEMVID_INSTALLED:false")
`;

      const result = await this.runPythonScript(status.pythonPath, checkScript);
      
      if (result.includes('MEMVID_INSTALLED:true')) {
        status.memvidInstalled = true;
        const versionMatch = result.match(/MEMVID_VERSION:(.+)/);
        if (versionMatch && versionMatch[1]) {
          status.memvidVersion = versionMatch[1].trim();
        }
      } else {
        status.memvidInstalled = false;
        
        // Extract specific error
        const errorMatch = result.match(/MEMVID_ERROR:(.+)/);
        const errorMsg = errorMatch?.[1]?.trim() || 'Unknown import error';

        status.issues.push({
          severity: 'error',
          component: 'memvid',
          message: `MemVid not installed: ${errorMsg}`,
          solution: this.getMemvidInstallInstructions(),
          autoFixable: true
        });
      }
    } catch (error) {
      status.issues.push({
        severity: 'error',
        component: 'memvid',
        message: `Failed to check MemVid installation: ${error}`,
        solution: this.getMemvidInstallInstructions(),
        autoFixable: false
      });
    }
  }

  /**
   * Check directory permissions for memory banks
   */
  private static async checkPermissions(status: SetupStatus): Promise<void> {
    try {
      const memoryBanksDir = process.env.MEMORY_BANKS_DIR || this.getDefaultMemoryBanksDir();
      
      // Ensure directory exists
      await fs.mkdir(memoryBanksDir, { recursive: true });
      
      // Test write permissions
      const testFile = path.join(memoryBanksDir, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      
    } catch (error) {
      status.issues.push({
        severity: 'error',
        component: 'permissions',
        message: `Cannot write to memory banks directory: ${error}`,
        solution: 'Check directory permissions or set MEMORY_BANKS_DIR environment variable',
        autoFixable: false
      });
    }
  }

  /**
   * Generate setup recommendations
   */
  private static generateRecommendations(status: SetupStatus): void {
    if (status.isReady) {
      status.recommendations.push('✅ System ready! MemVid MCP Server can start successfully.');
      return;
    }

    status.recommendations.push('🔧 Setup Required:');
    
    for (const issue of status.issues) {
      if (issue.severity === 'error') {
        status.recommendations.push(`❌ ${issue.component}: ${issue.solution}`);
      }
    }

    status.recommendations.push('');
    status.recommendations.push('📖 Complete setup guide: https://github.com/kcpatt27/memvid-mcp-server#setup');
  }

  /**
   * Run Python script and capture output
   */
  private static async runPythonScript(pythonCmd: string, script: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(pythonCmd, ['-c', script], { stdio: 'pipe' });
      let output = '';
      let error = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(error || 'Python script failed'));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        process.kill();
        reject(new Error('Python script timeout'));
      }, 10000);
    });
  }

  /**
   * Get platform-specific Python installation instructions
   */
  private static getPythonInstallInstructions(): string {
    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        return 'Install Python 3.8+ from https://python.org or Microsoft Store: "python"';
      case 'darwin':
        return 'Install Python 3.8+: "brew install python3" or from https://python.org';
      case 'linux':
        return 'Install Python 3.8+: "sudo apt install python3 python3-pip" or equivalent';
      default:
        return 'Install Python 3.8+ from https://python.org';
    }
  }

  /**
   * Get MemVid installation instructions
   */
  private static getMemvidInstallInstructions(): string {
    return 'Install MemVid: "pip install memvid" or "pip3 install memvid"';
  }

  /**
   * Get default memory banks directory
   */
  private static getDefaultMemoryBanksDir(): string {
    const platform = os.platform();
    const homeDir = os.homedir();
    
    switch (platform) {
      case 'win32':
        return path.join(homeDir, 'AppData', 'Roaming', 'memvid-mcp', 'memory-banks');
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'memvid-mcp', 'memory-banks');
      default:
        return path.join(homeDir, '.local', 'share', 'memvid-mcp', 'memory-banks');
    }
  }

  /**
   * Attempt to auto-fix common issues
   */
  static async autoFix(status: SetupStatus): Promise<SetupStatus> {
    const fixableIssues = status.issues.filter(i => i.autoFixable);
    
    for (const issue of fixableIssues) {
      if (issue.component === 'memvid' && status.pythonPath) {
        await this.attemptMemvidInstall(status.pythonPath);
      }
    }

    // Re-detect after auto-fix
    return this.detectSetup();
  }

  /**
   * Attempt to install MemVid automatically
   */
  private static async attemptMemvidInstall(pythonPath: string): Promise<boolean> {
    try {
      console.log('🔧 Attempting to install MemVid automatically...');
      
      // Try pip install
      const pipCommands = ['pip', 'pip3'];
      
      for (const pipCmd of pipCommands) {
        try {
          execSync(`${pipCmd} install memvid`, { stdio: 'inherit', timeout: 60000 });
          console.log('✅ MemVid installed successfully!');
          return true;
        } catch (error) {
          // Try next pip command
        }
      }

      // Try with python -m pip
      try {
        execSync(`${pythonPath} -m pip install memvid`, { stdio: 'inherit', timeout: 60000 });
        console.log('✅ MemVid installed successfully!');
        return true;
      } catch (error) {
        console.error('❌ Failed to install MemVid automatically');
        return false;
      }
    } catch (error) {
      console.error('❌ Auto-install failed:', error);
      return false;
    }
  }
} 