import { z } from 'zod';

// Configuration types
export interface MemvidConfig {
  chunk_size: number;
  overlap: number;
  embedding_model: string;
}

export interface StorageConfig {
  memory_banks_dir: string;
  max_file_size: string;
  cleanup_temp_files: boolean;
}

export interface SearchConfig {
  default_top_k: number;
  min_score_threshold: number;
  max_context_tokens: number;
}

export interface PerformanceConfig {
  cache_size: number;
  parallel_processing: boolean;
  max_concurrent_searches: number;
}

export interface ServerConfig {
  memvid: MemvidConfig;
  storage: StorageConfig;
  search: SearchConfig;
  performance: PerformanceConfig;
}

// Memory Bank types
export interface MemoryBankSource {
  type: 'file' | 'directory' | 'url' | 'text';
  path: string;
  options?: {
    chunk_size?: number;
    overlap?: number;
    file_types?: string[];
  };
}

export interface MemoryBankMetadata {
  name: string;
  description: string;
  size: number;
  created: string;
  last_updated: string;
  tags: string[];
  file_path: string;
}

export interface ContentMetadata {
  source?: string | undefined;
  category?: string | undefined;
  tags?: string[] | undefined;
  timestamp?: string | undefined;
}

export interface SearchResult {
  content: string;
  score: number;
  metadata: ContentMetadata;
  bank_name: string;
}

// Tool argument schemas using Zod
export const CreateMemoryBankArgsSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  sources: z.array(z.object({
    type: z.enum(['file', 'directory', 'url', 'text']),
    path: z.string(),
    options: z.object({
      chunk_size: z.number().optional(),
      overlap: z.number().optional(),
      file_types: z.array(z.string()).optional(),
    }).optional(),
  })),
  tags: z.array(z.string()).optional(),
});

// Enhanced search arguments for Phase 2 - matches Zod schema exactly
export interface SearchFilters {
  file_types?: string[];           
  date_range?: {
    start?: string;               
    end?: string;                 
  };
  min_file_size?: number;         
  max_file_size?: number;         
  tags?: string[];                
  content_length?: {
    min?: number;                 
    max?: number;                 
  };
}

export const SearchMemoryArgsSchema = z.object({
  query: z.string().min(1),
  memory_banks: z.array(z.string()).optional(),
  top_k: z.number().min(1).max(50).optional(),
  min_score: z.number().min(0).max(1).optional(),
  filters: z.object({
    file_types: z.array(z.string()).optional(),
    date_range: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    min_file_size: z.number().optional(),
    max_file_size: z.number().optional(),
    tags: z.array(z.string()).optional(),
    content_length: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
  }).optional(),
  sort_by: z.enum(['relevance', 'date', 'file_size', 'content_length']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

export const AddToMemoryArgsSchema = z.object({
  memory_bank: z.string().min(1),
  content: z.string().min(1),
  metadata: z.object({
    source: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    timestamp: z.string().optional(),
  }).optional(),
});

export const GetContextArgsSchema = z.object({
  query: z.string().min(1),
  memory_banks: z.array(z.string()).optional(),
  max_tokens: z.number().min(100).max(20000).optional(),
  include_metadata: z.boolean().optional(),
});

export const ListMemoryBanksArgsSchema = z.object({
  include_stats: z.boolean().optional(),
});

// Tool argument types
export type CreateMemoryBankArgs = z.infer<typeof CreateMemoryBankArgsSchema>;
export type SearchMemoryArgs = z.infer<typeof SearchMemoryArgsSchema>;
export type AddToMemoryArgs = z.infer<typeof AddToMemoryArgsSchema>;
export type GetContextArgs = z.infer<typeof GetContextArgsSchema>;
export type ListMemoryBanksArgs = z.infer<typeof ListMemoryBanksArgsSchema>;

// Tool response types
export interface CreateMemoryBankResponse {
  success: boolean;
  message: string;
  bank_name: string;
  file_path?: string;
  chunks_created?: number;
}

export interface SearchMemoryResponse {
  results: SearchResult[];
  total_results: number;
  query: string;
  banks_searched: string[];
}

export interface AddToMemoryResponse {
  success: boolean;
  message: string;
  chunks_added: number;
}

export interface GetContextResponse {
  context: string;
  sources: Array<{
    bank_name: string;
    content_preview: string;
    score: number;
  }>;
  total_tokens: number;
}

export interface ListMemoryBanksResponse {
  banks: MemoryBankMetadata[];
  total_count: number;
}

// Error types
export class MemvidMCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'MemvidMCPError';
  }
}

export class MemoryBankNotFoundError extends MemvidMCPError {
  constructor(bankName: string) {
    super(`Memory bank '${bankName}' not found`, 'BANK_NOT_FOUND', { bankName });
  }
}

export class InvalidSourceError extends MemvidMCPError {
  constructor(source: string, reason: string) {
    super(`Invalid source '${source}': ${reason}`, 'INVALID_SOURCE', { source, reason });
  }
}

// Enhanced Error Handling Types
export enum ErrorCode {
  // Transient Errors (retryable)
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  PROCESS_COMMUNICATION_FAILURE = 'PROCESS_COMMUNICATION_FAILURE',
  TEMPORARY_RESOURCE_CONSTRAINT = 'TEMPORARY_RESOURCE_CONSTRAINT',
  PYTHON_BRIDGE_UNAVAILABLE = 'PYTHON_BRIDGE_UNAVAILABLE',
  
  // Configuration Errors (user fixable)
  INVALID_MEMORY_BANK_NAME = 'INVALID_MEMORY_BANK_NAME',
  MISSING_SOURCE_FILE = 'MISSING_SOURCE_FILE',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  MEMORY_BANK_NOT_FOUND = 'MEMORY_BANK_NOT_FOUND',
  
  // System Errors (admin fixable)
  PYTHON_ENVIRONMENT_ERROR = 'PYTHON_ENVIRONMENT_ERROR',
  INSUFFICIENT_DISK_SPACE = 'INSUFFICIENT_DISK_SPACE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SYSTEM_RESOURCE_EXHAUSTED = 'SYSTEM_RESOURCE_EXHAUSTED',
  
  // Permanent Errors (non-retryable)
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  CORRUPTED_MEMORY_BANK = 'CORRUPTED_MEMORY_BANK',
  LOGIC_ERROR = 'LOGIC_ERROR',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface EnhancedError extends Error {
  code: ErrorCode;
  severity: ErrorSeverity;
  retryable: boolean;
  userMessage: string;
  technicalDetails: string;
  suggestedAction: string;
  context?: Record<string, any>;
  timestamp: Date;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: ErrorCode[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringPeriodMs: number;
}

export interface SystemHealthMetrics {
  timestamp: Date;
  pythonBridge: {
    isHealthy: boolean;
    responseTime?: number;
    lastError?: string;
  };
  systemResources: {
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    diskUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    cpuUsage?: number;
  };
  memoryBanks: {
    total: number;
    healthy: number;
    corrupted: number;
  };
}

export interface HealthCheckResult {
  isHealthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  checks: {
    pythonBridge: boolean;
    memoryBanks: boolean;
    systemResources: boolean;
  };
  metrics: SystemHealthMetrics;
  errors: string[];
  warnings: string[];
} 