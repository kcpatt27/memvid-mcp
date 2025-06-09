const { spawn } = require('child_process');

console.log('🏥 MemVid MCP Server Health Check');
console.log('=====================================\n');

const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let testsPassed = 0;
let totalTests = 0;
let serverStarted = false;

function runTest(name, testFn) {
  totalTests++;
  console.log(`🔍 Testing: ${name}`);
  return testFn();
}

function testPassed(message) {
  testsPassed++;
  console.log(`✅ ${message}`);
}

function testFailed(message) {
  console.log(`❌ ${message}`);
}

server.on('error', (error) => {
  console.error('❌ Server failed to start:', error.message);
  process.exit(1);
});

server.stderr.on('data', (data) => {
  const message = data.toString();
  if (message.includes('initialized successfully')) {
    serverStarted = true;
    testPassed('Server initialization successful');
  } else if (message.includes('error') || message.includes('Error')) {
    console.log(`⚠️  Server warning/error: ${message.trim()}`);
  }
});

// Test 1: Server startup
setTimeout(() => {
  runTest('Server Startup', () => {
    if (!serverStarted) {
      // Try to communicate with server anyway
      sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      });
    }
  });
}, 1000);

// Test 2: Tool listing
function sendRequest(request) {
  server.stdin.write(JSON.stringify(request) + '\n');
}

server.stdout.on('data', (data) => {
  try {
    const lines = data.toString().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        
        if (response.id === 1 && response.result?.tools) {
          runTest('Tool Discovery', () => {
            const toolCount = response.result.tools.length;
            if (toolCount >= 3) {
              testPassed(`Found ${toolCount} tools available`);
              
              // List all tools
              console.log('\n📋 Available Tools:');
              response.result.tools.forEach((tool, i) => {
                console.log(`   ${i+1}. ${tool.name}`);
              });
              
              // Test memory bank listing
              setTimeout(() => {
                sendRequest({
                  jsonrpc: '2.0',
                  id: 2,
                  method: 'tools/call',
                  params: {
                    name: 'list_memory_banks',
                    arguments: { include_stats: true }
                  }
                });
              }, 500);
              
            } else {
              testFailed(`Only found ${toolCount} tools, expected at least 3`);
            }
          });
        }
        
        if (response.id === 2) {
          runTest('Memory Bank Listing', () => {
            if (response.result) {
              testPassed('Memory bank listing successful');
              const result = JSON.parse(response.result.content[0].text);
              console.log(`   📁 Memory banks found: ${result.total_count}`);
            } else if (response.error) {
              console.log(`   ⚠️  Memory bank listing returned error: ${response.error.message}`);
            }
          });
          
          // Final results
          setTimeout(() => {
            console.log('\n🎯 Health Check Results:');
            console.log('========================');
            console.log(`✅ Tests Passed: ${testsPassed}/${totalTests}`);
            console.log(`🔧 Server Status: ${serverStarted ? 'Running' : 'Started but not fully initialized'}`);
            
            if (testsPassed === totalTests) {
              console.log('\n🎉 All systems operational! MemVid MCP Server is healthy.');
            } else {
              console.log('\n⚠️  Some issues detected. See details above.');
            }
            
            server.kill();
            process.exit(testsPassed === totalTests ? 0 : 1);
          }, 1000);
        }
        
      } catch (parseError) {
        // Skip non-JSON lines
      }
    }
  } catch (error) {
    console.error('Error processing server response:', error.message);
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('\n⏱️  Health check timeout - server not responding');
  console.log(`📊 Partial Results: ${testsPassed}/${totalTests} tests passed`);
  server.kill();
  process.exit(1);
}, 10000); 