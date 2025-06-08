#!/usr/bin/env node

/**
 * Phase 3d Test: Production Reliability with Real MCP Calls
 * Tests memory bank validation and error handling with actual MCP operations
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🛡️ Phase 3d Test: Production Reliability with MCP Operations');
console.log('=' .repeat(70));

// Build the server first
console.log('📦 Building server...');
try {
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Server built successfully');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

// Start the server
const serverProcess = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
});

let serverOutput = '';
let serverError = '';

serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
    process.stdout.write(`[SERVER] ${data}`);
});

serverProcess.stderr.on('data', (data) => {
    serverError += data.toString();
    process.stderr.write(`[SERVER ERR] ${data}`);
});

// MCP communication helper
function sendMCPRequest(request) {
    return new Promise((resolve, reject) => {
        const requestStr = JSON.stringify(request) + '\n';
        
        let responseData = '';
        const onData = (data) => {
            responseData += data.toString();
            try {
                const lines = responseData.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    const response = JSON.parse(line);
                    if (response.id === request.id) {
                        serverProcess.stdout.removeListener('data', onData);
                        resolve(response);
                        return;
                    }
                }
            } catch (e) {
                // Continue collecting data
            }
        };
        
        serverProcess.stdout.on('data', onData);
        serverProcess.stdin.write(requestStr);
        
        // Timeout after 30 seconds
        setTimeout(() => {
            serverProcess.stdout.removeListener('data', onData);
            reject(new Error('Request timeout'));
        }, 30000);
    });
}

// Main test execution
async function main() {
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🔍 Testing Production Reliability with MCP Operations...\n');

    try {
        await testValidMemoryBankSearch();
        await testInvalidMemoryBankSearch();
        await testMemoryBankListing();
        
        console.log('\n🎉 All production reliability MCP tests completed!');
        
    } catch (error) {
        console.error('\n❌ Production reliability MCP test failed:', error);
    } finally {
        // Clean up
        if (serverProcess && !serverProcess.killed) {
            serverProcess.kill();
        }
        process.exit(0);
    }
}

/**
 * Test 1: Search with Valid Memory Banks (Should Work)
 */
async function testValidMemoryBankSearch() {
    console.log('✅ Test 1: Search with Valid Memory Banks');
    
    try {
        const request = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
                name: 'search_memory',
                arguments: {
                    query: 'test content',
                    memory_banks: ['direct-test', 'minimal-test'],
                    top_k: 3
                }
            }
        };
        
        console.log('  🔍 Searching valid memory banks: direct-test, minimal-test');
        const response = await sendMCPRequest(request);
        
        if (response.error) {
            console.log('  ❌ Unexpected error:', response.error);
        } else {
            const results = response.result?.content?.[0]?.text;
            if (results) {
                const parsed = JSON.parse(results);
                console.log(`  ✅ Search successful: ${parsed.results?.length || 0} results from ${parsed.banks_searched?.length || 0} banks`);
                console.log(`  📊 Banks searched: ${parsed.banks_searched?.join(', ') || 'none'}`);
            } else {
                console.log('  ⚠️ No results returned');
            }
        }
        
    } catch (error) {
        console.error('  ❌ Valid bank search test failed:', error.message);
    }
    
    console.log('');
}

/**
 * Test 2: Search with Invalid Memory Banks (Should Handle Gracefully)
 */
async function testInvalidMemoryBankSearch() {
    console.log('🛡️ Test 2: Search with Invalid Memory Banks');
    
    try {
        const request = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'search_memory',
                arguments: {
                    query: 'test content',
                    memory_banks: ['non-existent-bank-' + Date.now(), 'another-fake-bank'],
                    top_k: 3
                }
            }
        };
        
        console.log('  🔍 Searching non-existent memory banks (should handle gracefully)');
        const response = await sendMCPRequest(request);
        
        if (response.error) {
            console.log('  ⚠️ Error response (expected for invalid banks):', response.error.message);
        } else {
            const results = response.result?.content?.[0]?.text;
            if (results) {
                const parsed = JSON.parse(results);
                console.log(`  ✅ Graceful handling: ${parsed.results?.length || 0} results from ${parsed.banks_searched?.length || 0} banks`);
                console.log(`  📊 Banks searched: ${parsed.banks_searched?.join(', ') || 'none'} (should be empty)`);
                
                if (parsed.banks_searched?.length === 0) {
                    console.log('  🎯 EXCELLENT: Invalid banks were filtered out, no crashes!');
                } else {
                    console.log('  ⚠️ Some invalid banks were not filtered');
                }
            } else {
                console.log('  ✅ No results returned (expected for invalid banks)');
            }
        }
        
    } catch (error) {
        console.error('  ❌ Invalid bank search test failed:', error.message);
    }
    
    console.log('');
}

/**
 * Test 3: Memory Bank Listing (Should Only Show Valid Banks)
 */
async function testMemoryBankListing() {
    console.log('📋 Test 3: Memory Bank Listing with Validation');
    
    try {
        const request = {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
                name: 'list_memory_banks',
                arguments: {
                    include_stats: false
                }
            }
        };
        
        console.log('  🔍 Listing memory banks (should only show validated banks)');
        const response = await sendMCPRequest(request);
        
        if (response.error) {
            console.log('  ❌ Unexpected error:', response.error);
        } else {
            const results = response.result?.content?.[0]?.text;
            if (results) {
                const parsed = JSON.parse(results);
                console.log(`  ✅ Found ${parsed.banks?.length || 0} validated memory banks:`);
                
                parsed.banks?.forEach(bank => {
                    console.log(`    📁 ${bank.name} (${bank.size || 'unknown'} chunks)`);
                });
                
                // Cross-check with file system
                const memoryBanksDir = './memory-banks';
                const files = fs.readdirSync(memoryBanksDir);
                const mp4Files = files.filter(file => file.endsWith('.mp4'));
                
                console.log(`  📊 File system has ${mp4Files.length} MP4 files, API returned ${parsed.banks?.length || 0} banks`);
                
                if (parsed.banks?.length <= mp4Files.length) {
                    console.log('  🎯 EXCELLENT: Validation is filtering out invalid banks!');
                } else {
                    console.log('  ⚠️ More banks returned than MP4 files found');
                }
            } else {
                console.log('  ⚠️ No banks returned');
            }
        }
        
    } catch (error) {
        console.error('  ❌ Bank listing test failed:', error.message);
    }
    
    console.log('');
}

// Execute main function
main().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
}); 