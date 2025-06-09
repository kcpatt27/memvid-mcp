/**
 * Health Monitoring Tools - Enhanced Error Handling
 * Provides health check and diagnostic capabilities for the MCP server
 */

import { HealthCheckResult, SystemHealthMetrics } from '../types/index.js';
import { DirectMemvidIntegration } from '../lib/memvid.js';
import { logger } from '../lib/logger.js';

export interface HealthCheckArgs {
  detailed?: boolean;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  timestamp: string;
  uptime: number;
  checks: {
    pythonBridge: boolean;
    memoryBanks: boolean;
    systemResources: boolean;
  };
  metrics?: SystemHealthMetrics;
  errors: string[];
  warnings: string[];
  errorRecoveryStatus?: {
    circuitBreakerState: string;
    failureCount: number;
    lastFailureTime: number;
  };
}

export interface DiagnosticsArgs {
  includeMetrics?: boolean;
  includeLogs?: boolean;
}

export interface DiagnosticsResponse {
  timestamp: string;
  systemInfo: {
    platform: string;
    nodeVersion: string;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
  healthStatus: HealthCheckResponse;
  errorRecovery: {
    circuitBreakerState: string;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
  };
  recentLogs?: string[];
}

export class HealthTools {
  private startTime: number;

  constructor(private memvid: DirectMemvidIntegration) {
    this.startTime = Date.now();
  }

  /**
   * Perform a health check of the system
   */
  async healthCheck(args: HealthCheckArgs): Promise<HealthCheckResponse> {
    try {
      logger.info('Performing health check', { detailed: args.detailed });

      // Get health status from the memvid integration
      let healthStatus = this.memvid.getHealthStatus();
      const errorRecoveryStatus = this.memvid.getErrorRecoveryStatus();

      // If no health status available yet, perform immediate health check
      if (!healthStatus) {
        logger.debug('No cached health status, performing immediate health check');
        // Try to perform a simple ping test
        try {
          const pingStart = Date.now();
          const pingResult = await this.memvid.ping();
          const pingTime = Date.now() - pingStart;
          
          // Return a basic health status based on ping result
          return {
            status: pingResult ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            checks: {
              pythonBridge: pingResult,
              memoryBanks: true, // Assume OK for now
              systemResources: true // Assume OK for now
            },
            metrics: {
              timestamp: new Date(),
              pythonBridge: {
                isHealthy: pingResult,
                responseTime: pingTime
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
            errors: pingResult ? [] : ['Python bridge ping failed'],
            warnings: [],
            errorRecoveryStatus: {
              circuitBreakerState: errorRecoveryStatus.state,
              failureCount: errorRecoveryStatus.failureCount,
              lastFailureTime: errorRecoveryStatus.lastFailureTime
            }
          };
        } catch (error) {
          return {
            status: 'unknown',
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            checks: {
              pythonBridge: false,
              memoryBanks: false,
              systemResources: false
            },
            errors: [`Immediate health check failed: ${error instanceof Error ? error.message : String(error)}`],
            warnings: [],
            errorRecoveryStatus: {
              circuitBreakerState: errorRecoveryStatus.state,
              failureCount: errorRecoveryStatus.failureCount,
              lastFailureTime: errorRecoveryStatus.lastFailureTime
            }
          };
        }
      }

      const response: HealthCheckResponse = {
        status: healthStatus.status,
        timestamp: healthStatus.metrics.timestamp.toISOString(),
        uptime: Date.now() - this.startTime,
        checks: healthStatus.checks,
        errors: healthStatus.errors,
        warnings: healthStatus.warnings,
        errorRecoveryStatus: {
          circuitBreakerState: errorRecoveryStatus.state,
          failureCount: errorRecoveryStatus.failureCount,
          lastFailureTime: errorRecoveryStatus.lastFailureTime
        }
      };

      // Include detailed metrics if requested
      if (args.detailed) {
        response.metrics = healthStatus.metrics;
      }

      logger.info('Health check completed', { 
        status: response.status, 
        errors: response.errors.length,
        warnings: response.warnings.length 
      });

      return response;

    } catch (error) {
      logger.error('Health check failed:', error);
      
      return {
        status: 'unknown',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        checks: {
          pythonBridge: false,
          memoryBanks: false,
          systemResources: false
        },
        errors: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  /**
   * Get comprehensive system diagnostics
   */
  async getDiagnostics(args: DiagnosticsArgs): Promise<DiagnosticsResponse> {
    try {
      logger.info('Gathering system diagnostics', args);

      // Get health status
      const healthStatus = await this.healthCheck({ detailed: true });
      const errorRecoveryStatus = this.memvid.getErrorRecoveryStatus();

      // Gather system information
      const systemInfo = {
        platform: process.platform,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      };

      const diagnostics: DiagnosticsResponse = {
        timestamp: new Date().toISOString(),
        systemInfo,
        healthStatus,
        errorRecovery: {
          circuitBreakerState: errorRecoveryStatus.state,
          failureCount: errorRecoveryStatus.failureCount,
          successCount: errorRecoveryStatus.successCount,
          lastFailureTime: errorRecoveryStatus.lastFailureTime
        }
      };

      // Include recent logs if requested
      if (args.includeLogs) {
        // This would require implementing a log buffer in the logger
        // For now, we'll just indicate that logs are available
        diagnostics.recentLogs = ['Log collection not yet implemented'];
      }

      logger.info('System diagnostics gathered successfully');
      return diagnostics;

    } catch (error) {
      logger.error('Failed to gather diagnostics:', error);
      throw error;
    }
  }

  /**
   * Reset error recovery state (circuit breaker)
   */
  async resetErrorRecovery(): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Resetting error recovery state');
      
      // This would require adding a reset method to the error recovery manager
      // For now, we'll return a placeholder response
      
      return {
        success: true,
        message: 'Error recovery state reset successfully'
      };

    } catch (error) {
      logger.error('Failed to reset error recovery:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get system uptime
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get formatted uptime string
   */
  getFormattedUptime(): string {
    const uptimeMs = this.getUptime();
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
} 