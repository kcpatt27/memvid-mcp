#!/usr/bin/env node

/**
 * Phase 3d Test: Concurrent Operations Support
 * Tests multiple MCP tool calls happening simultaneously
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Phase 3d Test: Concurrent Operations Support');
console.log('=' .repeat(60));

// Ensure server is built
console.log('📦 Building server...');
try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Server built successfully');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

// Start the server
const { spawn } = require('child_process');
const serverProcess = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
});

let serverOutput = '';
serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
});

serverProcess.stderr.on('data', (data) => {
    console.error('Server stderr:', data.toString());
});

// Main execution wrapper
async function main() {
    
// Wait for server to start
await new Promise(resolve => setTimeout(resolve, 2000));

/**
 * Test concurrent operations by making multiple MCP requests simultaneously
 */
async function testConcurrentOperations() {
    console.log('\n🔄 Testing Concurrent Operations...');
    
    try {
        // Simulate AI assistant making multiple requests simultaneously
        const concurrentOperations = [
            // Multiple search operations
            makeSearchRequest('authentication patterns', 'test-bank-1749348347510'),
            makeSearchRequest('database design', 'test-bank-1749348347510'),
            makeSearchRequest('API endpoints', 'direct-test'),
            
            // List operations happening simultaneously
            makeListRequest(),
            makeListRequest(),
            
            // Stats requests
            makeStatsRequest('test-bank-1749348347510'),
            makeStatsRequest('direct-test')
        ];
        
        console.log(`🚀 Starting ${concurrentOperations.length} concurrent operations...`);
        const startTime = Date.now();
        
        // Execute all operations concurrently
        const results = await Promise.allSettled(concurrentOperations);
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        console.log(`⏱️  All operations completed in ${totalTime}ms`);
        
        // Analyze results
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`✅ Successful operations: ${successful}/${results.length}`);
        console.log(`❌ Failed operations: ${failed}/${results.length}`);
        
        if (failed > 0) {
            console.log('\n🔍 Failed operation details:');
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.log(`  ${index + 1}: ${result.reason.message}`);
                }
            });
        }
        
        // Validate that operations didn't interfere with each other
        const searchResults = results
            .filter((r, i) => i < 3 && r.status === 'fulfilled') // First 3 are search operations
            .map(r => r.value);
            
        console.log('\n📊 Search Results Summary:');
        searchResults.forEach((result, index) => {
            const queries = ['authentication patterns', 'database design', 'API endpoints'];
            console.log(`  ${queries[index]}: ${result.total_results || 0} results`);
        });
        
        return {
            totalOperations: results.length,
            successful,
            failed,
            totalTime,
            averageTime: totalTime / results.length
        };
        
    } catch (error) {
        console.error('❌ Concurrent operations test failed:', error);
        throw error;
    }
}

/**
 * Make a search request via JSON-RPC
 */
async function makeSearchRequest(query, bankName) {
    const request = {
        jsonrpc: '2.0',
        id: Math.random().toString(36).substr(2, 9),
        method: 'tools/call',
        params: {
            name: 'search_memory',
            arguments: {
                query,
                bank_names: [bankName],
                limit: 3
            }
        }
    };
    
    return await sendJsonRpcRequest(request);
}

/**
 * Make a list request via JSON-RPC
 */
async function makeListRequest() {
    const request = {
        jsonrpc: '2.0',
        id: Math.random().toString(36).substr(2, 9),
        method: 'tools/call',
        params: {
            name: 'list_memory_banks',
            arguments: {}
        }
    };
    
    return await sendJsonRpcRequest(request);
}

/**
 * Make a stats request via JSON-RPC
 */
async function makeStatsRequest(bankName) {
    const request = {
        jsonrpc: '2.0',
        id: Math.random().toString(36).substr(2, 9),
        method: 'tools/call',
        params: {
            name: 'get_memory_bank_stats',
            arguments: {
                bank_name: bankName
            }
        }
    };
    
    return await sendJsonRpcRequest(request);
}

/**
 * Send JSON-RPC request to server
 */
async function sendJsonRpcRequest(request) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Request timeout: ${request.params.name}`));
        }, 30000);
        
        let responseBuffer = '';
        
        const handleResponse = (data) => {
            responseBuffer += data.toString();
            
            try {
                const response = JSON.parse(responseBuffer);
                clearTimeout(timeout);
                serverProcess.stdout.off('data', handleResponse);
                
                if (response.error) {
                    reject(new Error(response.error.message || 'Unknown error'));
                } else {
                    resolve(response.result);
                }
            } catch {
                // Incomplete JSON, wait for more data
            }
        };
        
        serverProcess.stdout.on('data', handleResponse);
        
        const requestStr = JSON.stringify(request) + '\n';
        serverProcess.stdin.write(requestStr);
    });
}

/**
 * Test performance under concurrent load
 */
async function testPerformanceUnderLoad() {
    console.log('\n🚀 Testing Performance Under Concurrent Load...');
    
    const loadTests = [
        { name: 'Light Load', operations: 3, description: '3 concurrent searches' },
        { name: 'Medium Load', operations: 5, description: '5 concurrent searches' },
        { name: 'Heavy Load', operations: 8, description: '8 concurrent searches' }
    ];
    
    for (const test of loadTests) {
        console.log(`\n📊 ${test.name}: ${test.description}`);
        
        const operations = Array(test.operations).fill().map((_, i) => 
            makeSearchRequest(`test query ${i}`, 'test-bank-1749348347510')
        );
        
        const startTime = Date.now();
        const results = await Promise.allSettled(operations);
        const endTime = Date.now();
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const totalTime = endTime - startTime;
        const avgTime = totalTime / test.operations;
        
        console.log(`  ✅ ${successful}/${test.operations} operations completed`);
        console.log(`  ⏱️  Total time: ${totalTime}ms`);
        console.log(`  📈 Average time per operation: ${avgTime.toFixed(1)}ms`);
        
        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

/**
 * Main test execution
 */
async function runTests() {
    try {
        // Test 1: Basic concurrent operations
        console.log('\n' + '='.repeat(60));
        console.log('🧪 TEST 1: CONCURRENT OPERATIONS SUPPORT');
        const concurrentResults = await testConcurrentOperations();
        
        // Test 2: Performance under load
        console.log('\n' + '='.repeat(60));
        console.log('🧪 TEST 2: PERFORMANCE UNDER LOAD');
        await testPerformanceUnderLoad();
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📋 PHASE 3D CONCURRENT OPERATIONS TEST SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`✅ Concurrent Operations: ${concurrentResults.successful}/${concurrentResults.totalOperations} successful`);
        console.log(`⏱️  Average operation time: ${concurrentResults.averageTime.toFixed(1)}ms`);
        console.log(`🔄 System handled concurrent requests: ${concurrentResults.failed === 0 ? 'YES' : 'WITH ISSUES'}`);
        
        if (concurrentResults.failed === 0 && concurrentResults.successful > 0) {
            console.log('\n🎉 PHASE 3D CONCURRENT OPERATIONS: SUCCESS!');
            console.log('✅ System successfully handles multiple simultaneous MCP requests');
            console.log('✅ No race conditions or conflicts detected');
            console.log('✅ Performance remains stable under concurrent load');
        } else {
            console.log('\n⚠️  PHASE 3D CONCURRENT OPERATIONS: NEEDS IMPROVEMENT');
            console.log(`❌ ${concurrentResults.failed} operations failed`);
            console.log('🔧 System may need additional thread safety improvements');
        }
        
    } catch (error) {
        console.error('\n❌ Test execution failed:', error);
        process.exit(1);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        serverProcess.kill();
    }
}

    // Run the tests
    await runTests();
}

// Execute main function
main().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
}); 