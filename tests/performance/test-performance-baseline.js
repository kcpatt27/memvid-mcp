import { readFile } from 'fs/promises';
import path from 'path';
import { PerformanceProfiler } from './dist/lib/performance.js';
import { logger } from './dist/lib/logger.js';

async function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config', 'default.json');
    const configData = await readFile(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error loading config:', error);
    process.exit(1);
  }
}

async function runPerformanceBaseline() {
  console.log('🚀 Starting Phase 3 Performance Baseline Testing\n');

  try {
    // Load configuration
    const config = await loadConfig();
    console.log('✅ Configuration loaded');

    // Initialize performance profiler
    const profiler = new PerformanceProfiler(config);
    await profiler.initialize();
    console.log('✅ Performance profiler initialized');

    // Run comprehensive benchmark suite
    console.log('\n📊 Running comprehensive benchmark suite...');
    console.log('This will test:');
    console.log('  - Memory bank creation performance');
    console.log('  - Enhanced search operation performance');
    console.log('  - Resource usage patterns');
    console.log('  - Concurrent operation handling');
    console.log('');

    const startTime = Date.now();
    const suite = await profiler.runBenchmarkSuite();
    const totalTime = Date.now() - startTime;

    console.log(`\n✅ Benchmark suite completed in ${totalTime}ms`);
    console.log(`📈 Suite: ${suite.suite_name}`);
    console.log(`📊 Total operations: ${suite.summary.total_operations}`);
    console.log(`⏱️  Average duration: ${suite.summary.average_duration_ms.toFixed(2)}ms`);
    console.log(`🔝 95th percentile: ${suite.summary.p95_duration_ms.toFixed(2)}ms`);
    console.log(`💾 Peak memory usage: ${suite.summary.peak_memory_usage_mb.toFixed(2)}MB`);

    // Generate detailed performance report
    console.log('\n📝 Generating performance report...');
    const report = await profiler.generatePerformanceReport();
    console.log('\n' + '='.repeat(60));
    console.log(report);
    console.log('='.repeat(60));

    // Phase 3 target analysis
    console.log('\n🎯 Phase 3 Target Analysis:');
    
    // Enhanced search performance target: <500ms
    const searchBenchmarks = suite.benchmarks.filter(b => b.operation.includes('search'));
    if (searchBenchmarks.length > 0) {
      const avgSearchTime = searchBenchmarks.reduce((sum, b) => sum + b.duration_ms, 0) / searchBenchmarks.length;
      const searchStatus = avgSearchTime < 500 ? '✅ MEETING TARGET' : '❌ NEEDS OPTIMIZATION';
      console.log(`  Enhanced Search: ${avgSearchTime.toFixed(2)}ms (Target: <500ms) ${searchStatus}`);
    }

    // Memory bank creation target: <2s
    const creationBenchmarks = suite.benchmarks.filter(b => b.operation.includes('create_memory_bank'));
    if (creationBenchmarks.length > 0) {
      const avgCreationTime = creationBenchmarks.reduce((sum, b) => sum + b.duration_ms, 0) / creationBenchmarks.length;
      const creationStatus = avgCreationTime < 2000 ? '✅ MEETING TARGET' : '❌ NEEDS OPTIMIZATION';
      console.log(`  Memory Bank Creation: ${avgCreationTime.toFixed(2)}ms (Target: <2000ms) ${creationStatus}`);
    }

    // Concurrent operations target: 5+ users
    const concurrentBenchmarks = suite.benchmarks.filter(b => b.operation.includes('concurrent_operations_5'));
    if (concurrentBenchmarks.length > 0) {
      const supportsConcurrency = concurrentBenchmarks[0].duration_ms < 1000;
      const concurrencyStatus = supportsConcurrency ? '✅ MEETING TARGET' : '❌ NEEDS OPTIMIZATION';
      console.log(`  Concurrent Operations: ${supportsConcurrency ? 'Supported' : 'Needs Work'} ${concurrencyStatus}`);
    }

    // Memory baseline target: <200MB
    const memoryBaseline = suite.summary.peak_memory_usage_mb;
    const memoryStatus = memoryBaseline < 200 ? '✅ MEETING TARGET' : '❌ NEEDS OPTIMIZATION';
    console.log(`  Memory Baseline: ${memoryBaseline.toFixed(2)}MB (Target: <200MB) ${memoryStatus}`);

    // Recommendations for optimization
    console.log('\n🔧 Optimization Recommendations:');
    
    if (searchBenchmarks.length > 0) {
      const avgSearchTime = searchBenchmarks.reduce((sum, b) => sum + b.duration_ms, 0) / searchBenchmarks.length;
      if (avgSearchTime >= 500) {
        console.log('  🔍 Implement search result caching for repeated queries');
        console.log('  🔍 Optimize embedding model loading and reuse');
        console.log('  🔍 Add query preprocessing and optimization');
      }
    }

    if (creationBenchmarks.length > 0) {
      const avgCreationTime = creationBenchmarks.reduce((sum, b) => sum + b.duration_ms, 0) / creationBenchmarks.length;
      if (avgCreationTime >= 2000) {
        console.log('  🏗️  Implement parallel chunk processing');
        console.log('  🏗️  Optimize embedding batch operations');
        console.log('  🏗️  Add incremental encoding for large files');
      }
    }

    if (memoryBaseline >= 200) {
      console.log('  💾 Implement memory pool management');
      console.log('  💾 Add garbage collection optimization');
      console.log('  💾 Implement memory bank streaming');
    }

    console.log('\n🎯 Next Steps for Phase 3:');
    console.log('1. 🔄 Implement caching system for enhanced search results');
    console.log('2. ⚡ Optimize memory bank creation with parallel processing');
    console.log('3. 🧠 Add intelligent memory management');
    console.log('4. 🔒 Implement advanced error handling for production');
    
    console.log(`\n✅ Performance baseline established! Results saved to performance-reports/`);

  } catch (error) {
    console.error('\n❌ Error running performance baseline:', error);
    logger.error('Performance baseline test failed:', error);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n👋 Performance baseline test interrupted');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught exception during performance test:', error);
  process.exit(1);
});

// Run the baseline test
runPerformanceBaseline().catch((error) => {
  console.error('Failed to run performance baseline:', error);
  process.exit(1);
}); 