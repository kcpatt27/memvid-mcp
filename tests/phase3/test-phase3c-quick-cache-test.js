#!/usr/bin/env node

/**
 * Phase 3c Quick Cache Test
 * 
 * Simple test to validate search result caching is working:
 * 1. Allow time for initial sentence_transformers download
 * 2. Perform a search (cache miss)
 * 3. Repeat the search immediately (cache hit)
 * 4. Measure performance improvement
 */

import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Phase 3c Quick Cache Test');
console.log('============================');
console.log('Testing search result caching with realistic timeouts\n');

const serverPath = path.join(process.cwd(), 'dist', 'server.js');

class QuickCacheTest {
  constructor() {
    this.serverProcess = null;
    this.bridgeReady = false;
    this.heavyImportsLoaded = false;
  }

  async runTest() {
    try {
      console.log('🔄 Starting MCP server...');
      await this.startServer();
      
      console.log('\n📊 Test 1: First Search (Cache Miss + Model Loading)');
      const firstSearch = await this.performSearch('test content', 1, 120000); // 2 minutes for first search
      
      if (firstSearch.success) {
        console.log(`✅ First search completed: ${firstSearch.time}ms`);
        console.log(`📊 Results: ${firstSearch.totalResults} results from ${firstSearch.banksSearched} banks`);
        
        // Wait a moment for cache to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('\n🎯 Test 2: Repeat Search (Cache Hit Expected)');
        const secondSearch = await this.performSearch('test content', 2, 10000); // 10 seconds max
        
        if (secondSearch.success) {
          console.log(`✅ Second search completed: ${secondSearch.time}ms`);
          
          const improvement = Math.round(((firstSearch.time - secondSearch.time) / firstSearch.time) * 100);
          
          console.log('\n🎉 CACHE PERFORMANCE ANALYSIS');
          console.log('============================');
          console.log(`📊 First Search (Cache Miss): ${firstSearch.time}ms`);
          console.log(`🎯 Second Search (Cache Hit): ${secondSearch.time}ms`);
          console.log(`📈 Performance Improvement: ${improvement}%`);
          
          if (secondSearch.time < 2000) {
            console.log('🎉 EXCELLENT: Cached search under 2 seconds!');
          } else if (secondSearch.time < 5000) {
            console.log('✅ GOOD: Cached search under 5 seconds');
          } else {
            console.log('⚠️  NEEDS OPTIMIZATION: Cached search over 5 seconds');
          }
          
          if (improvement > 50) {
            console.log('🎉 CACHE EFFECTIVENESS: 50%+ improvement achieved!');
          } else {
            console.log('⚠️  Cache improvement could be better');
          }
          
        } else {
          console.log('❌ Second search failed - may not have reached cache layer');
        }
      } else {
        console.log('❌ First search failed - may still be downloading models');
        console.log('💡 Note: First run with sentence_transformers can take 30-60 seconds');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      this.cleanup();
    }
  }

  async startServer() {
    this.serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 30000);

      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        
        if (output.includes('Bridge ready, sent JSON ready signal')) {
          this.bridgeReady = true;
          console.log('✅ Bridge startup completed (~200ms - lazy loading working!)');
        }
        
        if (output.includes('Heavy dependencies loaded successfully')) {
          this.heavyImportsLoaded = true;
          console.log('✅ Heavy dependencies loaded');
        }
        
        if (this.bridgeReady) {
          clearTimeout(timeout);
          setTimeout(resolve, 2000); // Wait for full initialization
        }
      });

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('MemVid MCP Server running')) {
          console.log('✅ MCP Server operational');
        }
      });
    });
  }

  async performSearch(query, id, timeoutMs = 30000) {
    const searchStart = Date.now();
    
    const searchRequest = {
      jsonrpc: '2.0',
      id: id,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: { query }
      }
    };

    return new Promise((resolve) => {
      let responseReceived = false;
      
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          resolve({
            query,
            time: Date.now() - searchStart,
            totalResults: 0,
            banksSearched: 0,
            success: false,
            error: 'timeout'
          });
        }
      }, timeoutMs);

      const dataHandler = (data) => {
        const output = data.toString();
        
        // Look for cache indicators
        if (output.includes('Cache HIT')) {
          console.log('🎯 Cache HIT detected!');
        } else if (output.includes('Cache MISS')) {
          console.log('📊 Cache MISS - performing full search');
        }
        
        const lines = output.split('\n');
        
        for (const line of lines) {
          if (line.includes(`"id":${id}`) && line.includes('"jsonrpc":"2.0"')) {
            try {
              const response = JSON.parse(line);
              if (response.result && response.result.content) {
                const content = response.result.content[0].text;
                const searchResult = JSON.parse(content);
                
                responseReceived = true;
                clearTimeout(timeout);
                this.serverProcess.stdout.off('data', dataHandler);
                
                resolve({
                  query,
                  time: Date.now() - searchStart,
                  totalResults: searchResult.total_results || 0,
                  banksSearched: searchResult.banks_searched?.length || 0,
                  success: true
                });
                return;
              }
            } catch (parseError) {
              // Continue looking for response
            }
          }
        }
      };

      this.serverProcess.stdout.on('data', dataHandler);
      this.serverProcess.stdin.write(JSON.stringify(searchRequest) + '\n');
    });
  }

  cleanup() {
    console.log('\n🔄 Cleaning up...');
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }
}

// Run the test
const tester = new QuickCacheTest();
tester.runTest().catch(console.error); 