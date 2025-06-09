import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { MemvidConfig, SearchResult, ContentMetadata } from '../types/index.js';
import { logger } from './logger.js';
import { ErrorRecoveryManager } from './error-recovery.js';
import { SystemHealthMonitor } from './system-health-monitor.js';

interface JsonRpcRequest {
  id: string;
  method: string;
  params: any;
}

interface JsonRpcResponse {
  id: string;
  result?: any;
  error?: {
    message: string;
    type: string;
    traceback?: string;
  };
}

/**
 * Direct MemVid Integration - Eliminates subprocess bottleneck
 * Uses persistent Python process with JSON-RPC communication
 * Target: 3-5s performance vs 30s+ subprocess timeouts
 */
export class DirectMemvidIntegration {
  private pythonProcess: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private errorRecovery: ErrorRecoveryManager;
  private healthMonitor: SystemHealthMonitor | null = null;

  constructor(private config: MemvidConfig) {
    this.errorRecovery = new ErrorRecoveryManager();
  }

  /**
   * Start health monitoring for the Python bridge
   */
  startHealthMonitoring(): void {
    if (!this.healthMonitor) {
      this.healthMonitor = new SystemHealthMonitor({
        checkIntervalMs: 30000,
        pythonBridgeTimeoutMs: 5000,
        memoryThresholdPercent: 85,
        diskThresholdPercent: 90,
        memoryBanksDir: './memory-banks'
      }, this);

      // Set up event listeners for health alerts
      this.healthMonitor.on('criticalAlert', (alert) => {
        logger.error('Critical system health alert:', alert);
      });

      this.healthMonitor.on('warningAlert', (alert) => {
        logger.warn('System health warning:', alert);
      });

      this.healthMonitor.on('statusChange', (change) => {
        logger.info('System health status changed:', change);
      });

      this.healthMonitor.start();
      logger.info('Health monitoring started for DirectMemvidIntegration');
    }
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthMonitor) {
      this.healthMonitor.stop();
      this.healthMonitor = null;
      logger.info('Health monitoring stopped');
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    return this.healthMonitor?.getLastHealthCheck() || null;
  }

  /**
   * Get error recovery status
   */
  getErrorRecoveryStatus() {
    return this.errorRecovery.getCircuitBreakerStatus();
  }

  /**
   * Initialize the Python bridge process
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      logger.info('Initializing DirectMemvidIntegration...');

      // Get the server's project directory
      const serverDir = path.dirname(path.dirname(__dirname)); // Go up from dist/lib/ to project root
      
      // Get Python executable path
      const pythonPath = process.platform === 'win32' 
        ? path.join(serverDir, 'memvid-env', 'Scripts', 'python.exe')
        : path.join(serverDir, 'memvid-env', 'bin', 'python');

      // Get bridge script path
      const bridgePath = path.join(serverDir, 'src', 'lib', 'memvid-bridge.py');

      // Spawn Python bridge process
      this.pythonProcess = spawn(pythonPath, [bridgePath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(serverDir, 'memvid'), // Run from memvid directory
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      if (!this.pythonProcess.stdout || !this.pythonProcess.stdin || !this.pythonProcess.stderr) {
        throw new Error('Failed to create Python process stdio streams');
      }

      // Set up response handling
      let buffer = '';
      this.pythonProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            this.handleResponse(line.trim());
          }
        }
      });

      // Handle stderr
      this.pythonProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          logger.warn('Python bridge stderr:', message);
        }
      });

      // Handle process exit
      this.pythonProcess.on('exit', (code, signal) => {
        logger.warn(`Python bridge exited with code ${code}, signal ${signal}`);
        this.cleanup();
      });

      this.pythonProcess.on('error', (error) => {
        logger.error('Python bridge error:', error);
        this.cleanup();
      });

      // Wait for ready signal
      await this.waitForReady();
      
      this.isInitialized = true;
      logger.info('DirectMemvidIntegration initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize DirectMemvidIntegration:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Wait for the Python bridge to signal it's ready
   */
  private async waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for Python bridge ready signal'));
      }, 10000); // 10 second timeout

      const handleData = (data: Buffer) => {
        const message = data.toString().trim();
        try {
          const parsed = JSON.parse(message);
          if (parsed.status === 'ready') {
            clearTimeout(timeout);
            this.pythonProcess?.stdout?.off('data', handleData);
            resolve();
          }
        } catch {
          // Ignore non-JSON messages during startup
        }
      };

      this.pythonProcess?.stdout?.on('data', handleData);
    });
  }

  /**
   * Handle JSON-RPC response from Python bridge
   */
  private handleResponse(line: string): void {
    try {
      const response: JsonRpcResponse = JSON.parse(line);
      const pending = this.pendingRequests.get(response.id);
      
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);

        if (response.error) {
          const error = new Error(response.error.message);
          (error as any).type = response.error.type;
          (error as any).traceback = response.error.traceback;
          pending.reject(error);
        } else {
          pending.resolve(response.result);
        }
      }
    } catch (error) {
      logger.error('Error parsing Python bridge response:', error, 'Line:', line);
    }
  }

  /**
   * Send JSON-RPC request to Python bridge
   */
  private async sendRequest(method: string, params: any, timeoutMs: number = 30000): Promise<any> {
    await this.initialize();

    if (!this.pythonProcess || !this.pythonProcess.stdin) {
      throw new Error('Python bridge not available');
    }

    const id = (++this.requestId).toString();
    const request: JsonRpcRequest = { id, method, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const requestLine = JSON.stringify(request) + '\n';
      this.pythonProcess!.stdin!.write(requestLine);
    });
  }

  /**
   * Create a memory bank from sources using MemVid encoder
   */
  async createMemoryBank(
    name: string,
    sources: Array<{ type: string; path: string; content?: string; options?: any }>,
    outputPath: string
  ): Promise<{ success: boolean; chunksCreated: number; error?: string }> {
    return await this.errorRecovery.executeWithRecovery(
      async () => {
      logger.info(`Creating memory bank '${name}' from ${sources.length} sources`);

      const result = await this.sendRequest('encode', {
        sources,
        output_path: outputPath,
        chunk_size: this.config.chunk_size,
        overlap: this.config.overlap,
        embedding_model: this.config.embedding_model
      });

      return {
        success: result.success,
        chunksCreated: result.chunks_created || 0,
        error: result.success ? undefined : result.error
      };
      },
      'createMemoryBank',
      { name, sourcesCount: sources.length, outputPath }
    ).catch(error => {
      logger.error(`Error creating memory bank '${name}':`, error);
      return {
        success: false,
        chunksCreated: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    });
  }

  /**
   * Search memory bank using MemVid retriever
   */
  async searchMemoryBank(
    bankPath: string,
    query: string,
    topK: number = 5,
    minScore: number = 0.3
  ): Promise<SearchResult[]> {
    return await this.errorRecovery.executeWithRecovery(
      async () => {
      logger.info(`Searching memory bank at '${bankPath}' for query: '${query}'`);

      // Derive video_path and index_path from bankPath
      // bankPath could be either the .mp4 file or the base name
      const basePath = bankPath.replace(/\.(mp4|json|faiss)$/, '');
      const videoPath = `${basePath}.mp4`;
      const indexPath = `${basePath}.json`;

      const result = await this.sendRequest('search', {
        video_path: videoPath,
        index_path: indexPath,
        query,
        top_k: topK,
        min_score: minScore
      });

      if (result.success) {
        return this.parseSearchResults(result.results || [], path.basename(basePath));
      } else {
        logger.error('Search failed:', result.error);
        return [];
      }
      },
      'searchMemoryBank',
      { bankPath, query, topK, minScore }
    ).catch(error => {
      logger.error(`Error searching memory bank:`, error);
      return [];
    });
  }

  /**
   * Add content to existing memory bank
   */
  async addToMemoryBank(
    bankPath: string,
    content: string,
    metadata?: ContentMetadata
  ): Promise<{ success: boolean; chunksAdded: number; error?: string }> {
    try {
      logger.info(`Adding content to memory bank at '${bankPath}'`);

      const result = await this.sendRequest('add_content', {
        bank_path: bankPath,
        content,
        metadata: metadata || {},
        chunk_size: this.config.chunk_size,
        overlap: this.config.overlap
      });

      return {
        success: result.success,
        chunksAdded: result.chunks_added || 0,
        error: result.success ? undefined : result.error
      };

    } catch (error) {
      logger.error(`Error adding to memory bank:`, error);
      return {
        success: false,
        chunksAdded: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get memory bank statistics
   */
  async getMemoryBankStats(bankPath: string): Promise<{ chunks: number; size: number } | null> {
    try {
      logger.info(`Getting stats for memory bank at '${bankPath}'`);
      
      const stats = await this.sendRequest('stats', {
        bank_path: bankPath
      });

      return stats;

    } catch (error) {
      logger.error(`Error getting memory bank stats:`, error);
      return null;
    }
  }

  /**
   * Ping the Python bridge to check for a live connection
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.sendRequest('ping', {}, 1000);
      return response === 'pong';
    } catch {
      return false;
    }
  }

  /**
   * Standardize search results
   */
  private parseSearchResults(results: any[], bankName: string): SearchResult[] {
    return (results || []).map(r => ({
      bank_name: bankName,
      source: r.source || 'Unknown',
      content: r.content,
      score: r.score,
      metadata: r.metadata || {}
    }));
  }

  /**
   * Clean up Python bridge process and pending requests
   */
  cleanup(): void {
    logger.info('Cleaning up DirectMemvidIntegration...');
    
    // Stop health monitoring
    this.stopHealthMonitoring();
    
    if (this.pythonProcess) {
      if (!this.pythonProcess.killed) {
        this.pythonProcess.kill();
      }
      this.pythonProcess = null;
    }
    
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Memvid integration is shutting down'));
    }
    this.pendingRequests.clear();
    this.isInitialized = false;
    this.initializationPromise = null;
  }
  
  /**
   * Gracefully destroy the integration instance
   */
  async destroy(): Promise<void> {
    this.cleanup();
  }
}
