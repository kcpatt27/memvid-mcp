/**
 * Error Recovery Manager - Enhanced Error Handling
 * Implements retry logic, circuit breaker pattern, and error classification
 */

import { 
  ErrorCode, 
  ErrorSeverity, 
  EnhancedError, 
  RetryConfig, 
  CircuitBreakerConfig 
} from '../types/index.js';
import { logger } from './logger.js';

export class ErrorRecoveryManager {
  private retryConfig: RetryConfig;
  private circuitBreakerConfig: CircuitBreakerConfig;
  private circuitState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    retryConfig?: Partial<RetryConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ) {
    this.retryConfig = {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableErrors: [
        ErrorCode.NETWORK_TIMEOUT,
        ErrorCode.PROCESS_COMMUNICATION_FAILURE,
        ErrorCode.TEMPORARY_RESOURCE_CONSTRAINT,
        ErrorCode.PYTHON_BRIDGE_UNAVAILABLE
      ],
      ...retryConfig
    };

    this.circuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeoutMs: 60000,
      monitoringPeriodMs: 30000,
      ...circuitBreakerConfig
    };
  }

  /**
   * Execute an operation with retry logic and circuit breaker protection
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    // Check circuit breaker state
    if (this.circuitState === 'open') {
      if (Date.now() - this.lastFailureTime > this.circuitBreakerConfig.resetTimeoutMs) {
        this.circuitState = 'half-open';
        this.successCount = 0;
        logger.info(`Circuit breaker transitioning to half-open for ${operationName}`);
      } else {
        throw this.createEnhancedError(
          ErrorCode.PYTHON_BRIDGE_UNAVAILABLE,
          ErrorSeverity.HIGH,
          false,
          'Service temporarily unavailable due to repeated failures',
          `Circuit breaker is open for ${operationName}`,
          'Please wait and try again later',
          { ...context, circuitState: this.circuitState }
        );
      }
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.retryConfig.maxAttempts) {
      attempt++;

      try {
        logger.debug(`Executing ${operationName}, attempt ${attempt}/${this.retryConfig.maxAttempts}`);
        
        const result = await operation();
        
        // Success - reset circuit breaker if needed
        this.onSuccess(operationName);
        
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Classify the error
        const enhancedError = this.classifyError(lastError, context);
        
        logger.warn(`${operationName} failed on attempt ${attempt}:`, {
          error: enhancedError.message,
          code: enhancedError.code,
          retryable: enhancedError.retryable
        });

        // Check if we should retry
        if (!enhancedError.retryable || attempt >= this.retryConfig.maxAttempts) {
          this.onFailure(operationName, enhancedError);
          throw enhancedError;
        }

        // Calculate delay for next retry
        const delay = this.calculateRetryDelay(attempt);
        
        if (attempt < this.retryConfig.maxAttempts) {
          logger.info(`Retrying ${operationName} in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxAttempts})`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    const finalError = this.classifyError(lastError!, context);
    this.onFailure(operationName, finalError);
    throw finalError;
  }

  /**
   * Classify an error and create an enhanced error object
   */
  classifyError(error: Error, context?: Record<string, any>): EnhancedError {
    // If already an enhanced error, return as-is
    if (this.isEnhancedError(error)) {
      return error;
    }

    // Classify based on error message and type
    const errorMessage = error.message.toLowerCase();
    
    // Network and communication errors
    if (errorMessage.includes('timeout') || errorMessage.includes('econnreset')) {
      return this.createEnhancedError(
        ErrorCode.NETWORK_TIMEOUT,
        ErrorSeverity.MEDIUM,
        true,
        'The operation timed out',
        error.message,
        'Check your network connection and try again',
        context
      );
    }

    if (errorMessage.includes('python bridge') || errorMessage.includes('process')) {
      return this.createEnhancedError(
        ErrorCode.PROCESS_COMMUNICATION_FAILURE,
        ErrorSeverity.HIGH,
        true,
        'Unable to communicate with the processing service',
        error.message,
        'The service will attempt to restart automatically',
        context
      );
    }

    // File and permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('eacces')) {
      return this.createEnhancedError(
        ErrorCode.PERMISSION_DENIED,
        ErrorSeverity.HIGH,
        false,
        'Permission denied accessing required files',
        error.message,
        'Check file permissions or contact your administrator',
        context
      );
    }

    if (errorMessage.includes('no such file') || errorMessage.includes('enoent')) {
      return this.createEnhancedError(
        ErrorCode.MISSING_SOURCE_FILE,
        ErrorSeverity.MEDIUM,
        false,
        'Required file not found',
        error.message,
        'Verify the file path and ensure the file exists',
        context
      );
    }

    if (errorMessage.includes('disk') || errorMessage.includes('enospc')) {
      return this.createEnhancedError(
        ErrorCode.INSUFFICIENT_DISK_SPACE,
        ErrorSeverity.HIGH,
        false,
        'Insufficient disk space',
        error.message,
        'Free up disk space and try again',
        context
      );
    }

    // Memory bank specific errors
    if (errorMessage.includes('memory bank') && errorMessage.includes('not found')) {
      return this.createEnhancedError(
        ErrorCode.MEMORY_BANK_NOT_FOUND,
        ErrorSeverity.MEDIUM,
        false,
        'Memory bank not found',
        error.message,
        'Check the memory bank name and ensure it exists',
        context
      );
    }

    // Default to logic error for unclassified errors
    return this.createEnhancedError(
      ErrorCode.LOGIC_ERROR,
      ErrorSeverity.MEDIUM,
      false,
      'An unexpected error occurred',
      error.message,
      'If this persists, please contact support',
      context
    );
  }

  /**
   * Create an enhanced error object
   */
  createEnhancedError(
    code: ErrorCode,
    severity: ErrorSeverity,
    retryable: boolean,
    userMessage: string,
    technicalDetails: string,
    suggestedAction: string,
    context?: Record<string, any>
  ): EnhancedError {
    const error = new Error(userMessage) as EnhancedError;
    error.code = code;
    error.severity = severity;
    error.retryable = retryable;
    error.userMessage = userMessage;
    error.technicalDetails = technicalDetails;
    error.suggestedAction = suggestedAction;
    error.context = context || {};
    error.timestamp = new Date();
    
    return error;
  }

  /**
   * Handle successful operation
   */
  private onSuccess(operationName: string): void {
    if (this.circuitState === 'half-open') {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close
        this.circuitState = 'closed';
        this.failureCount = 0;
        logger.info(`Circuit breaker closed for ${operationName} after successful recovery`);
      }
    } else if (this.circuitState === 'closed') {
      // Reset failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(operationName: string, error: EnhancedError): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.circuitState === 'closed' && this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      this.circuitState = 'open';
      logger.error(`Circuit breaker opened for ${operationName} after ${this.failureCount} failures`);
    } else if (this.circuitState === 'half-open') {
      this.circuitState = 'open';
      logger.warn(`Circuit breaker returned to open state for ${operationName}`);
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is already an enhanced error
   */
  private isEnhancedError(error: Error): error is EnhancedError {
    return 'code' in error && 'severity' in error && 'retryable' in error;
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return {
      state: this.circuitState,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    };
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuitBreaker(): void {
    this.circuitState = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    logger.info('Circuit breaker manually reset');
  }
} 