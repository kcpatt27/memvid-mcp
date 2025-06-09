/**
 * System Health Monitor - Enhanced Error Handling
 * Monitors system resources, Python bridge health, and memory bank status
 */

import { 
  SystemHealthMetrics, 
  HealthCheckResult, 
  ErrorCode, 
  ErrorSeverity 
} from '../types/index.js';
import { logger } from './logger.js';
import { DirectMemvidIntegration } from './memvid.js';
import { memoryBankValidator } from './memory-bank-validator.js';
import { EventEmitter } from 'events';
import os from 'os';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface HealthMonitorConfig {
  checkIntervalMs: number;
  pythonBridgeTimeoutMs: number;
  memoryThresholdPercent: number;
  diskThresholdPercent: number;
  memoryBanksDir: string;
}

export class SystemHealthMonitor extends EventEmitter {
  private config: HealthMonitorConfig;
  private isMonitoring = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastHealthCheck: HealthCheckResult | null = null;
  private pythonBridge: DirectMemvidIntegration | null = null;

  constructor(
    config?: Partial<HealthMonitorConfig>,
    pythonBridge?: DirectMemvidIntegration
  ) {
    super();
    this.config = {
      checkIntervalMs: 30000, // 30 seconds
      pythonBridgeTimeoutMs: 5000, // 5 seconds
      memoryThresholdPercent: 85, // 85% memory usage threshold
      diskThresholdPercent: 90, // 90% disk usage threshold
      memoryBanksDir: './memory-banks',
      ...config
    };
    this.pythonBridge = pythonBridge || null;
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.isMonitoring) {
      logger.warn('Health monitoring already started');
      return;
    }

    logger.info('Starting system health monitoring', {
      interval: this.config.checkIntervalMs,
      memoryThreshold: this.config.memoryThresholdPercent,
      diskThreshold: this.config.diskThresholdPercent
    });

    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.performHealthCheck().catch(error => {
        logger.error('Health check failed:', error);
      });
    }, this.config.checkIntervalMs);

    // Perform initial health check
    this.performHealthCheck().catch(error => {
      logger.error('Initial health check failed:', error);
    });
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('Stopping system health monitoring');
    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Set Python bridge instance for health checks
   */
  setPythonBridge(bridge: DirectMemvidIntegration): void {
    this.pythonBridge = bridge;
  }

  /**
   * Perform a comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    logger.debug('Performing system health check');

    const result: HealthCheckResult = {
      isHealthy: true,
      status: 'healthy',
      checks: {
        pythonBridge: false,
        memoryBanks: false,
        systemResources: false
      },
      metrics: {
        timestamp: new Date(),
        pythonBridge: {
          isHealthy: false
        },
        systemResources: {
          memoryUsage: { used: 0, total: 0, percentage: 0 },
          diskUsage: { used: 0, total: 0, percentage: 0 }
        },
        memoryBanks: {
          total: 0,
          healthy: 0,
          corrupted: 0
        }
      },
      errors: [],
      warnings: []
    };

    try {
      // Check Python bridge health
      const pythonBridgeCheck = await this.checkPythonBridgeHealth();
      result.checks.pythonBridge = pythonBridgeCheck.isHealthy;
      result.metrics.pythonBridge = pythonBridgeCheck;

      if (!pythonBridgeCheck.isHealthy) {
        result.errors.push(pythonBridgeCheck.lastError || 'Python bridge unhealthy');
      }

      // Check system resources
      const resourcesCheck = await this.checkSystemResources();
      result.checks.systemResources = resourcesCheck.isHealthy;
      result.metrics.systemResources = resourcesCheck.metrics;

      if (!resourcesCheck.isHealthy) {
        result.errors.push(...resourcesCheck.errors);
        result.warnings.push(...resourcesCheck.warnings);
      }

      // Check memory banks
      const memoryBanksCheck = await this.checkMemoryBanks();
      result.checks.memoryBanks = memoryBanksCheck.isHealthy;
      result.metrics.memoryBanks = memoryBanksCheck.metrics;

      if (!memoryBanksCheck.isHealthy) {
        result.errors.push(...memoryBanksCheck.errors);
        result.warnings.push(...memoryBanksCheck.warnings);
      }

      // Determine overall health status
      const healthyChecks = Object.values(result.checks).filter(check => check).length;
      const totalChecks = Object.keys(result.checks).length;

      if (healthyChecks === totalChecks) {
        result.status = 'healthy';
        result.isHealthy = true;
      } else if (healthyChecks >= totalChecks / 2) {
        result.status = 'degraded';
        result.isHealthy = false;
      } else {
        result.status = 'unhealthy';
        result.isHealthy = false;
      }

      // Emit health status events
      this.emitHealthEvents(result);

      const duration = Date.now() - startTime;
      logger.debug(`Health check completed in ${duration}ms`, {
        status: result.status,
        errors: result.errors.length,
        warnings: result.warnings.length
      });

      this.lastHealthCheck = result;
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.status = 'unknown';
      result.isHealthy = false;
      result.errors.push(`Health check failed: ${errorMessage}`);
      
      logger.error('System health check failed:', error);
      this.lastHealthCheck = result;
      return result;
    }
  }

  /**
   * Check Python bridge health
   */
  private async checkPythonBridgeHealth(): Promise<{
    isHealthy: boolean;
    responseTime?: number;
    lastError?: string;
  }> {
    if (!this.pythonBridge) {
      return {
        isHealthy: false,
        lastError: 'Python bridge not available'
      };
    }

    try {
      const startTime = Date.now();
      const isHealthy = await Promise.race([
        this.pythonBridge.ping(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), this.config.pythonBridgeTimeoutMs)
        )
      ]);
      const responseTime = Date.now() - startTime;

      return {
        isHealthy,
        responseTime
      };
    } catch (error) {
      return {
        isHealthy: false,
        lastError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check system resources
   */
  private async checkSystemResources(): Promise<{
    isHealthy: boolean;
    metrics: {
      memoryUsage: { used: number; total: number; percentage: number };
      diskUsage: { used: number; total: number; percentage: number };
      cpuUsage?: number;
    };
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    // Disk usage for current directory
          // Get the server's project directory
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const serverDir = path.dirname(path.dirname(__dirname)); // Go up from dist/lib/ to project root
      const diskUsage = await this.getDiskUsage(serverDir);

    // Check thresholds
    if (memoryPercentage > this.config.memoryThresholdPercent) {
      errors.push(`High memory usage: ${memoryPercentage.toFixed(1)}%`);
    } else if (memoryPercentage > this.config.memoryThresholdPercent * 0.8) {
      warnings.push(`Elevated memory usage: ${memoryPercentage.toFixed(1)}%`);
    }

    if (diskUsage.percentage > this.config.diskThresholdPercent) {
      errors.push(`High disk usage: ${diskUsage.percentage.toFixed(1)}%`);
    } else if (diskUsage.percentage > this.config.diskThresholdPercent * 0.8) {
      warnings.push(`Elevated disk usage: ${diskUsage.percentage.toFixed(1)}%`);
    }

    return {
      isHealthy: errors.length === 0,
      metrics: {
        memoryUsage: {
          used: usedMemory,
          total: totalMemory,
          percentage: memoryPercentage
        },
        diskUsage: {
          used: diskUsage.used,
          total: diskUsage.total,
          percentage: diskUsage.percentage
        }
      },
      errors,
      warnings
    };
  }

  /**
   * Check memory banks health
   */
  private async checkMemoryBanks(): Promise<{
    isHealthy: boolean;
    metrics: {
      total: number;
      healthy: number;
      corrupted: number;
    };
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get list of available memory banks
      const availableBanks = await memoryBankValidator.getAvailableMemoryBanks();
      
      if (availableBanks.length === 0) {
        warnings.push('No memory banks found');
        return {
          isHealthy: true,
          metrics: { total: 0, healthy: 0, corrupted: 0 },
          errors,
          warnings
        };
      }

      // Validate all memory banks
      const validationResults = await memoryBankValidator.validateBanks(availableBanks);
      
      let healthy = 0;
      let corrupted = 0;

      for (const [bankName, validation] of validationResults) {
        if (validation.isValid) {
          healthy++;
        } else {
          corrupted++;
          if (validation.errors.length > 0) {
            errors.push(`Memory bank '${bankName}': ${validation.errors[0]}`);
          }
        }
      }

      const corruptionPercentage = (corrupted / availableBanks.length) * 100;
      if (corruptionPercentage > 25) {
        errors.push(`High memory bank corruption rate: ${corruptionPercentage.toFixed(1)}%`);
      } else if (corruptionPercentage > 10) {
        warnings.push(`Elevated memory bank corruption rate: ${corruptionPercentage.toFixed(1)}%`);
      }

      return {
        isHealthy: corrupted === 0 || corruptionPercentage <= 10,
        metrics: {
          total: availableBanks.length,
          healthy,
          corrupted
        },
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Memory bank check failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        isHealthy: false,
        metrics: { total: 0, healthy: 0, corrupted: 0 },
        errors,
        warnings
      };
    }
  }

  /**
   * Get disk usage for a directory
   */
  private async getDiskUsage(dirPath: string): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    try {
      const stats = await fs.statfs(dirPath);
      const total = stats.blocks * stats.bsize;
      const free = stats.bavail * stats.bsize;
      const used = total - free;
      const percentage = (used / total) * 100;

      return { used, total, percentage };
    } catch {
      // Fallback for systems without statfs
      return { used: 0, total: 1, percentage: 0 };
    }
  }

  /**
   * Emit health events based on status changes
   */
  private emitHealthEvents(result: HealthCheckResult): void {
    // Emit general health status
    this.emit('healthCheck', result);

    // Emit specific events for status changes
    if (this.lastHealthCheck && this.lastHealthCheck.status !== result.status) {
      this.emit('statusChange', {
        from: this.lastHealthCheck.status,
        to: result.status,
        timestamp: result.metrics.timestamp
      });
    }

    // Emit alerts for critical issues
    if (result.status === 'unhealthy') {
      this.emit('criticalAlert', {
        errors: result.errors,
        timestamp: result.metrics.timestamp
      });
    } else if (result.status === 'degraded') {
      this.emit('warningAlert', {
        warnings: result.warnings,
        errors: result.errors,
        timestamp: result.metrics.timestamp
      });
    }
  }

  /**
   * Get the last health check result
   */
  getLastHealthCheck(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  /**
   * Get health monitoring status
   */
  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      checkInterval: this.config.checkIntervalMs,
      lastCheck: this.lastHealthCheck?.metrics.timestamp,
      configuration: this.config
    };
  }
} 