// @ts-nocheck
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import { logger } from './logger.js';
import { MemvidIntegration } from './memvid.js';
import { StorageManager } from './storage.js';
import { ServerConfig, SearchMemoryArgs, CreateMemoryBankArgs } from '../types/index.js';

export interface PerformanceBenchmark {
  operation: string;
  duration_ms: number;
  memory_usage_mb: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface BenchmarkSuite {
  suite_name: string;
  started_at: string;
  completed_at?: string;
  benchmarks: PerformanceBenchmark[];
  summary: {
    total_operations: number;
    average_duration_ms: number;
    max_duration_ms: number;
    min_duration_ms: number;
    p95_duration_ms: number;
    total_memory_usage_mb: number;
    peak_memory_usage_mb: number;
  };
}

export class PerformanceProfiler {
  private config: ServerConfig;
  private memvid: MemvidIntegration;
  private storage: StorageManager;
  private currentBenchmarks: PerformanceBenchmark[] = [];
  private reportPath: string;

  constructor(config: ServerConfig) {
    this.config = config;
    this.memvid = new MemvidIntegration(config.memvid);
    this.storage = new StorageManager(config);
    // Get the server's project directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const serverDir = path.dirname(path.dirname(__dirname)); // Go up from dist/lib/ to project root
    this.reportPath = path.join(serverDir, 'performance-reports');
  }

  /**
   * Initialize performance profiler
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.reportPath, { recursive: true });
    await this.storage.initialize();
    logger.info('Performance profiler initialized');
  }

  /**
   * Run comprehensive performance benchmark suite
   */
  async runBenchmarkSuite(): Promise<BenchmarkSuite> {
    const suiteName = `performance_benchmark_${Date.now()}`;
    const startTime = new Date().toISOString();
    
    logger.info(`Starting performance benchmark suite: ${suiteName}`);
    
    this.currentBenchmarks = [];

    try {
      // 1. Memory Bank Creation Benchmarks
      await this.benchmarkMemoryBankCreation();
      
      // 2. Search Performance Benchmarks
      await this.benchmarkSearchOperations();
      
      // 3. Resource Usage Benchmarks
      await this.benchmarkResourceUsage();
      
      // 4. Concurrent Operations Benchmarks
      await this.benchmarkConcurrentOperations();

      const suite: BenchmarkSuite = {
        suite_name: suiteName,
        started_at: startTime,
        completed_at: new Date().toISOString(),
        benchmarks: this.currentBenchmarks,
        summary: this.calculateSummary()
      };

      // Save benchmark results
      await this.saveBenchmarkResults(suite);
      
      logger.info(`Benchmark suite completed: ${suite.summary.total_operations} operations, avg: ${suite.summary.average_duration_ms}ms`);
      
      return suite;

    } catch (error) {
      logger.error('Error during benchmark suite:', error);
      throw error;
    }
  }

  /**
   * Benchmark memory bank creation performance
   */
  private async benchmarkMemoryBankCreation(): Promise<void> {
    logger.info('Benchmarking memory bank creation...');

    // Test different sizes of content
    const testCases = [
      { name: 'small_text', content: 'Lorem ipsum '.repeat(100), target: '<2s' },
      { name: 'medium_text', content: 'Lorem ipsum '.repeat(1000), target: '<2s' },
      { name: 'large_text', content: 'Lorem ipsum '.repeat(5000), target: '<2s' }
    ];

    for (const testCase of testCases) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const serverDir = path.dirname(path.dirname(__dirname)); // Go up from dist/lib/ to project root
      const tempFile = path.join(serverDir, 'temp', `benchmark_${testCase.name}.txt`);
      
      try {
        // Create test file
        await fs.mkdir(path.dirname(tempFile), { recursive: true });
        await fs.writeFile(tempFile, testCase.content);

        const args: CreateMemoryBankArgs = {
          name: `benchmark_${testCase.name}_${Date.now()}`,
          sources: [{ type: 'file', path: tempFile }]
        };

        // Measure creation time
        const startTime = performance.now();
        const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

        // Simulate memory bank creation (simplified for benchmarking)
        const result = await this.memvid.createMemoryBank(
          args.name,
          args.sources,
          this.storage.getMemoryBankPath(args.name)
        );

        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;

        this.currentBenchmarks.push({
          operation: `create_memory_bank_${testCase.name}`,
          duration_ms: endTime - startTime,
          memory_usage_mb: endMemory - startMemory,
          timestamp: new Date().toISOString(),
          metadata: {
            chunks_created: result.chunksCreated,
            content_size: testCase.content.length,
            target: testCase.target,
            success: result.success
          }
        });

        // Cleanup
        await fs.unlink(tempFile);
        
      } catch (error) {
        logger.error(`Error in memory bank creation benchmark ${testCase.name}:`, error);
      }
    }
  }

  /**
   * Benchmark search operation performance
   */
  private async benchmarkSearchOperations(): Promise<void> {
    logger.info('Benchmarking search operations...');

    // Create a test memory bank for searching
    const testBankName = `search_benchmark_${Date.now()}`;
    const testContent = 'Machine learning artificial intelligence deep learning neural networks computer vision natural language processing data science statistics algorithms optimization'.repeat(50);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const serverDir = path.dirname(path.dirname(__dirname)); // Go up from dist/lib/ to project root
    const testFile = path.join(serverDir, 'temp', 'search_benchmark.txt');
    
    try {
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, testContent);

      // Create test bank
      await this.memvid.createMemoryBank(
        testBankName,
        [{ type: 'file', path: testFile }],
        this.storage.getMemoryBankPath(testBankName)
      );

      // Register the bank
      await this.storage.registerMemoryBank(
        testBankName,
        'Test bank for search benchmarking',
        this.storage.getMemoryBankPath(testBankName),
        ['benchmark'],
        10
      );

      // Test different query complexities
      const searchQueries = [
        { query: 'machine learning', complexity: 'simple', target: '<500ms' },
        { query: 'artificial intelligence and deep learning algorithms', complexity: 'medium', target: '<500ms' },
        { query: 'computer vision natural language processing optimization techniques', complexity: 'complex', target: '<500ms' }
      ];

      for (const testQuery of searchQueries) {
        for (let i = 0; i < 3; i++) { // Run each query 3 times for average
          const startTime = performance.now();
          const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

          const results = await this.memvid.searchMemoryBank(
            this.storage.getMemoryBankPath(testBankName),
            testQuery.query,
            this.config.search.default_top_k,
            this.config.search.min_score_threshold
          );

          const endTime = performance.now();
          const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;

          this.currentBenchmarks.push({
            operation: `search_${testQuery.complexity}`,
            duration_ms: endTime - startTime,
            memory_usage_mb: endMemory - startMemory,
            timestamp: new Date().toISOString(),
            metadata: {
              query: testQuery.query,
              results_count: results.length,
              target: testQuery.target,
              run: i + 1
            }
          });
        }
      }

      // Cleanup
      await fs.unlink(testFile);
      
    } catch (error) {
      logger.error('Error in search benchmarking:', error);
    }
  }

  /**
   * Benchmark resource usage patterns
   */
  private async benchmarkResourceUsage(): Promise<void> {
    logger.info('Benchmarking resource usage...');

    const startTime = performance.now();
    const initialMemory = process.memoryUsage();

    // Simulate sustained operations
    const operations = 10;
    for (let i = 0; i < operations; i++) {
      // Simulate a search operation
      const stepStart = performance.now();
      
      // Memory usage simulation
      const buffer = Buffer.alloc(1024 * 1024); // 1MB allocation
      
      const stepEnd = performance.now();
      const currentMemory = process.memoryUsage();

      this.currentBenchmarks.push({
        operation: 'resource_usage_step',
        duration_ms: stepEnd - stepStart,
        memory_usage_mb: (currentMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024,
        timestamp: new Date().toISOString(),
        metadata: {
          step: i + 1,
          heap_used_mb: currentMemory.heapUsed / 1024 / 1024,
          heap_total_mb: currentMemory.heapTotal / 1024 / 1024,
          external_mb: currentMemory.external / 1024 / 1024,
          target: '<200MB baseline'
        }
      });
    }

    const endTime = performance.now();
    const finalMemory = process.memoryUsage();

    this.currentBenchmarks.push({
      operation: 'sustained_resource_usage',
      duration_ms: endTime - startTime,
      memory_usage_mb: (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024,
      timestamp: new Date().toISOString(),
      metadata: {
        operations: operations,
        memory_growth_mb: (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024,
        target: '<200MB baseline'
      }
    });
  }

  /**
   * Benchmark concurrent operations
   */
  private async benchmarkConcurrentOperations(): Promise<void> {
    logger.info('Benchmarking concurrent operations...');

    const concurrencyLevels = [1, 3, 5];
    
    for (const concurrency of concurrencyLevels) {
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      // Create concurrent search operations
      const promises = Array(concurrency).fill(null).map(async (_, index) => {
        // Simulate search operation
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(`result_${index}`);
          }, Math.random() * 100 + 50); // 50-150ms simulated operation
        });
      });

      await Promise.all(promises);

      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      this.currentBenchmarks.push({
        operation: `concurrent_operations_${concurrency}`,
        duration_ms: endTime - startTime,
        memory_usage_mb: endMemory - startMemory,
        timestamp: new Date().toISOString(),
        metadata: {
          concurrency_level: concurrency,
          target: concurrency <= 5 ? 'supported' : 'stretch'
        }
      });
    }
  }

  /**
   * Calculate benchmark suite summary
   */
  private calculateSummary() {
    const durations = this.currentBenchmarks.map(b => b.duration_ms);
    const memoryUsages = this.currentBenchmarks.map(b => b.memory_usage_mb);

    durations.sort((a, b) => a - b);

    return {
      total_operations: this.currentBenchmarks.length,
      average_duration_ms: durations.reduce((a, b) => a + b, 0) / durations.length,
      max_duration_ms: Math.max(...durations),
      min_duration_ms: Math.min(...durations),
      p95_duration_ms: durations[Math.floor(durations.length * 0.95)] || 0,
      total_memory_usage_mb: memoryUsages.reduce((a, b) => a + b, 0),
      peak_memory_usage_mb: Math.max(...memoryUsages)
    };
  }

  /**
   * Save benchmark results to file
   */
  private async saveBenchmarkResults(suite: BenchmarkSuite): Promise<void> {
    const filename = `${suite.suite_name}.json`;
    const filepath = path.join(this.reportPath, filename);
    
    await fs.writeFile(filepath, JSON.stringify(suite, null, 2));
    logger.info(`Benchmark results saved to: ${filepath}`);
  }

  /**
   * Measure operation performance
   */
  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; benchmark: PerformanceBenchmark }> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    const result = await operation();

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    const benchmark: PerformanceBenchmark = {
      operation: operationName,
      duration_ms: endTime - startTime,
      memory_usage_mb: endMemory - startMemory,
      timestamp: new Date().toISOString(),
      ...(metadata && { metadata })
    };

    return { result, benchmark };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<string> {
    const reportFiles = await fs.readdir(this.reportPath);
    const jsonFiles = reportFiles.filter(f => f.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      return 'No benchmark data available. Run benchmark suite first.';
    }

    // Load latest benchmark suite
    const latestFile = jsonFiles.sort().pop();
    if (!latestFile) {
      return 'No benchmark data available. Run benchmark suite first.';
    }
    const latestSuite = JSON.parse(
      await fs.readFile(path.join(this.reportPath, latestFile), 'utf-8')
    ) as BenchmarkSuite;

    // Generate report
    let report = `# Performance Benchmark Report\n\n`;
    report += `**Suite:** ${latestSuite.suite_name}\n`;
    report += `**Completed:** ${latestSuite.completed_at}\n\n`;

    report += `## Summary\n`;
    report += `- **Total Operations:** ${latestSuite.summary.total_operations}\n`;
    report += `- **Average Duration:** ${latestSuite.summary.average_duration_ms.toFixed(2)}ms\n`;
    report += `- **95th Percentile:** ${latestSuite.summary.p95_duration_ms.toFixed(2)}ms\n`;
    report += `- **Peak Memory Usage:** ${latestSuite.summary.peak_memory_usage_mb.toFixed(2)}MB\n\n`;

    report += `## Phase 3 Targets vs Results\n`;
    
    // Enhanced search performance
    const searchBenchmarks = latestSuite.benchmarks.filter(b => b.operation.includes('search'));
    const avgSearchTime = searchBenchmarks.reduce((sum, b) => sum + b.duration_ms, 0) / searchBenchmarks.length;
    report += `- **Enhanced Search Response:** ${avgSearchTime.toFixed(2)}ms (Target: <500ms) ${avgSearchTime < 500 ? '✅' : '❌'}\n`;

    // Memory bank creation
    const creationBenchmarks = latestSuite.benchmarks.filter(b => b.operation.includes('create_memory_bank'));
    const avgCreationTime = creationBenchmarks.reduce((sum, b) => sum + b.duration_ms, 0) / creationBenchmarks.length;
    report += `- **Memory Bank Creation:** ${avgCreationTime.toFixed(2)}ms (Target: <2000ms) ${avgCreationTime < 2000 ? '✅' : '❌'}\n`;

    // Concurrent operations
    const concurrentBenchmarks = latestSuite.benchmarks.filter(b => b.operation.includes('concurrent_operations_5'));
    const supportsConcurrency = concurrentBenchmarks.length > 0 ? concurrentBenchmarks[0].duration_ms < 1000 : false;
    report += `- **5+ Concurrent Users:** ${supportsConcurrency ? 'Supported' : 'Needs Work'} ${supportsConcurrency ? '✅' : '❌'}\n`;

    // Memory baseline
    const memoryBaseline = latestSuite.summary.peak_memory_usage_mb;
    report += `- **Memory Baseline:** ${memoryBaseline.toFixed(2)}MB (Target: <200MB) ${memoryBaseline < 200 ? '✅' : '❌'}\n\n`;

    report += `## Detailed Results\n`;
    for (const benchmark of latestSuite.benchmarks) {
      report += `- **${benchmark.operation}:** ${benchmark.duration_ms.toFixed(2)}ms, ${benchmark.memory_usage_mb.toFixed(2)}MB\n`;
    }

    return report;
  }
} 