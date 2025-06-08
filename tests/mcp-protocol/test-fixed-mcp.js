import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class MCPTestClient {
  constructor() {
    this.requestId = 1;
  }

  async testServer() {
    console.log('🚀 Starting comprehensive MCP server test...');
    
    return new Promise((resolve, reject) => {
      const serverPath = path.join(__dirname, 'dist', 'server.js');
      console.log(`Starting server: ${serverPath}`);
      
      const server = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let serverReady = false;
      let testResults = [];

      const cleanup = () => {
        if (server && !server.killed) {
          server.kill('SIGTERM');
        }
      };

      const timeout = setTimeout(() => {
        console.log('❌ Test timeout');
        cleanup();
        reject(new Error('Test timeout'));
      }, 45000);

      // Handle server output
      server.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Server stdout:', output);
      });

      server.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('Server stderr:', output);
        
        if (output.includes('MemVid MCP Server running on stdio')) {
          serverReady = true;
          console.log('✅ Server is ready');
          setTimeout(() => this.runTests(server, testResults, cleanup, resolve, reject), 1000);
        }
      });

      server.on('close', (code) => {
        clearTimeout(timeout);
        console.log(`Server process closed with code ${code}`);
        resolve(testResults);
      });

      server.on('error', (error) => {
        clearTimeout(timeout);
        console.error('Server error:', error);
        reject(error);
      });

      // Initialize connection
      console.log('Sending initialize request...');
      this.sendRequest(server, {
        jsonrpc: "2.0",
        id: this.requestId++,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: "test-client",
            version: "1.0.0"
          }
        }
      });
    });
  }

  async runTests(server, testResults, cleanup, resolve, reject) {
    try {
      console.log('\n📝 Running test suite...');
      
      // Test 1: List memory banks without stats (should work)
      console.log('\n1️⃣ Testing list_memory_banks without stats...');
      await this.testListBanksNoStats(server, testResults);
      
      // Test 2: List memory banks with stats (the problematic case)
      console.log('\n2️⃣ Testing list_memory_banks with stats...');
      await this.testListBanksWithStats(server, testResults);
      
      console.log('\n✅ All tests completed');
      console.log('\n📊 Test Results Summary:');
      testResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.name}: ${result.success ? '✅ PASS' : '❌ FAIL'} - ${result.message}`);
      });
      
      cleanup();
      resolve(testResults);
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      cleanup();
      reject(error);
    }
  }

  async testListBanksNoStats(server, testResults) {
    return new Promise((resolve, reject) => {
      const requestId = this.requestId++;
      let responseReceived = false;
      
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          testResults.push({
            name: 'List banks without stats',
            success: false,
            message: 'Timeout - no response received'
          });
          resolve();
        }
      }, 10000);

      const responseHandler = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === requestId) {
            responseReceived = true;
            clearTimeout(timeout);
            server.stdout.off('data', responseHandler);
            
            if (response.result && response.result.banks) {
              testResults.push({
                name: 'List banks without stats',
                success: true,
                message: `Found ${response.result.banks.length} banks`
              });
              console.log(`✅ No stats test passed: ${response.result.banks.length} banks found`);
            } else {
              testResults.push({
                name: 'List banks without stats',
                success: false,
                message: 'Invalid response format'
              });
              console.log('❌ No stats test failed: invalid response format');
            }
            resolve();
          }
        } catch (error) {
          // Ignore JSON parsing errors for non-response data
        }
      };

      server.stdout.on('data', responseHandler);

      this.sendRequest(server, {
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/call",
        params: {
          name: "list_memory_banks",
          arguments: {
            include_stats: false
          }
        }
      });
    });
  }

  async testListBanksWithStats(server, testResults) {
    return new Promise((resolve, reject) => {
      const requestId = this.requestId++;
      let responseReceived = false;
      
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          testResults.push({
            name: 'List banks with stats',
            success: false,
            message: 'Timeout - no response received (likely hanging issue)'
          });
          console.log('❌ Stats test failed: timeout (hanging issue)');
          resolve();
        }
      }, 20000); // Longer timeout for stats

      const responseHandler = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === requestId) {
            responseReceived = true;
            clearTimeout(timeout);
            server.stdout.off('data', responseHandler);
            
            if (response.result && response.result.banks) {
              const hasStats = response.result.banks.some(bank => 
                bank.stats && typeof bank.stats.chunks === 'number' && typeof bank.stats.size === 'number'
              );
              
              if (hasStats) {
                testResults.push({
                  name: 'List banks with stats',
                  success: true,
                  message: `Found ${response.result.banks.length} banks with stats`
                });
                console.log(`✅ Stats test passed: ${response.result.banks.length} banks with stats`);
              } else {
                testResults.push({
                  name: 'List banks with stats',
                  success: false,
                  message: 'Response received but no stats found'
                });
                console.log('❌ Stats test failed: no stats in response');
              }
            } else {
              testResults.push({
                name: 'List banks with stats',
                success: false,
                message: 'Invalid response format'
              });
              console.log('❌ Stats test failed: invalid response format');
            }
            resolve();
          }
        } catch (error) {
          // Ignore JSON parsing errors for non-response data
        }
      };

      server.stdout.on('data', responseHandler);

      this.sendRequest(server, {
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/call",
        params: {
          name: "list_memory_banks",
          arguments: {
            include_stats: true
          }
        }
      });
    });
  }

  sendRequest(server, request) {
    const requestStr = JSON.stringify(request) + '\n';
    console.log(`Sending request: ${requestStr.trim()}`);
    server.stdin.write(requestStr);
  }
}

// Run the test
const client = new MCPTestClient();
client.testServer()
  .then(results => {
    console.log('\n🎉 Test complete!');
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    console.log(`Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎊 All tests passed! The hanging issue has been fixed.');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Please check the results above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }); 