const { spawn } = require('child_process');

console.log('🚀 Phase 3b: Memory Bank Creation Performance Test');
console.log('⏱️  Measuring performance with lazy loading architecture...');

const startTime = Date.now();
const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let initialized = false;
let requestSent = false;
let bridgeReadyTime = null;

server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    try {
      const message = JSON.parse(line);
      
      if (!initialized && message.method === 'notifications/initialized') {
        console.log('✅ MCP Server initialized');
        initialized = true;
        
        const createRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'create_memory_bank',
            arguments: {
              name: 'phase3b-perf-' + Date.now(),
              description: 'Phase 3b performance validation - testing lazy loading breakthrough',
              sources: [
                {
                  type: 'text',
                  path: 'Phase 3b Performance Test: This content tests our lazy loading architecture breakthrough. The system now starts the bridge in ~200ms instead of 30+ seconds by deferring sentence_transformers import until memory bank creation. This validates our Phase 3a success and measures Phase 3b performance targets of 3-5s subsequent operations.'
                }
              ],
              tags: ['phase3b', 'performance', 'lazy-loading-test']
            }
          }
        };
        
        console.log('📤 Sending memory bank creation request...');
        server.stdin.write(JSON.stringify(createRequest) + '\n');
        requestSent = true;
      }
      else if (requestSent && message.id === 1) {
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        console.log('\n🎉 MEMORY BANK CREATION COMPLETED!');
        console.log('⏱️  Performance Results:');
        console.log('   - Total time: ' + totalTime + 'ms (' + (totalTime/1000).toFixed(1) + 's)');
        
        if (bridgeReadyTime) {
          console.log('   - Bridge startup: ' + (bridgeReadyTime - startTime) + 'ms');
          console.log('   - Memory bank creation: ' + (endTime - bridgeReadyTime) + 'ms');
        }
        
        if (message.result) {
          console.log('✅ SUCCESS! Memory bank created');
          console.log('📊 Performance Analysis:');
          if (totalTime < 5000) {
            console.log('   🎯 EXCELLENT: Under 5s target!');
          } else if (totalTime < 10000) {
            console.log('   ✅ GOOD: Under 10s, within expected range');
          } else if (totalTime < 60000) {
            console.log('   ⚠️  ACCEPTABLE: First-time creation with model download');
          } else {
            console.log('   ❌ INVESTIGATION NEEDED: Exceeds expected timeframes');
          }
        } else if (message.error) {
          console.log('❌ ERROR:', message.error.message || message.error);
        }
        
        server.kill();
        process.exit(0);
      }
    } catch (e) {
      // Non-JSON lines might be logs
      if (line.includes('Bridge ready')) {
        bridgeReadyTime = Date.now();
        console.log('🔍 Bridge ready signal detected at ' + (bridgeReadyTime - startTime) + 'ms');
      }
    }
  }
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Bridge ready') || output.includes('lazy loading') || output.includes('heavy dependencies')) {
    console.log('🔍 Bridge:', output.trim());
    if (output.includes('Bridge ready') && !bridgeReadyTime) {
      bridgeReadyTime = Date.now();
    }
  }
});

server.on('error', (error) => {
  console.log('❌ Server error:', error.message);
  process.exit(1);
});

// Timeout after 2 minutes
setTimeout(() => {
  console.log('⏰ Test timeout reached (2 minutes)');
  server.kill();
  process.exit(1);
}, 120000);

// Send initialize message
setTimeout(() => {
  const initMessage = {
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'phase3b-performance-test',
        version: '1.0.0'
      }
    }
  };
  
  console.log('📡 Initializing MCP connection...');
  server.stdin.write(JSON.stringify(initMessage) + '\n');
}, 500); 