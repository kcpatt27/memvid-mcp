const { spawn } = require('child_process');

console.log('🔧 Testing Path Configuration Fixes');
console.log('=====================================\n');

const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let testResults = {
  serverStart: false,
  toolsList: false,
  pathsResolved: false,
  memoryBankList: false
};

server.on('error', (error) => {
  console.error('❌ Server failed to start:', error.message);
  process.exit(1);
});

// Monitor stderr for path information
server.stderr.on('data', (data) => {
  const message = data.toString();
  
  // Look for our new logging messages about paths
  if (message.includes('Memory banks directory:')) {
    console.log('✅ Memory banks directory configured:', message.trim());
    testResults.pathsResolved = true;
  }
  
  if (message.includes('Registry path:')) {
    console.log('✅ Registry path configured:', message.trim());
    testResults.pathsResolved = true;
  }
  
  if (message.includes('initialized successfully')) {
    console.log('✅ Server initialization successful');
    testResults.serverStart = true;
  }
  
  if (message.includes('error') || message.includes('ENOENT')) {
    console.log('⚠️  Server message:', message.trim());
  }
});

// Test sequence
setTimeout(() => {
  console.log('🔍 Testing tools list...');
  const listTools = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  });
  server.stdin.write(listTools + '\n');
}, 1000);

setTimeout(() => {
  console.log('🔍 Testing memory bank listing...');
  const listBanks = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'list_memory_banks',
      arguments: { include_stats: true }
    }
  });
  server.stdin.write(listBanks + '\n');
}, 2000);

server.stdout.on('data', (data) => {
  try {
    const lines = data.toString().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        
        if (response.id === 1 && response.result?.tools) {
          console.log(`✅ Tools list successful: ${response.result.tools.length} tools available`);
          testResults.toolsList = true;
        }
        
        if (response.id === 2) {
          if (response.result) {
            console.log('✅ Memory bank listing successful');
            const result = JSON.parse(response.result.content[0].text);
            console.log(`   📁 Banks found: ${result.total_count}`);
            testResults.memoryBankList = true;
          } else if (response.error) {
            console.log('❌ Memory bank listing error:', response.error.message);
            if (response.error.message.includes('ENOENT')) {
              console.log('   🔍 This suggests path configuration issues remain');
            }
          }
          
          // Final assessment after all tests
          setTimeout(() => {
            console.log('\n🎯 Path Fix Assessment:');
            console.log('=======================');
            
            const passed = Object.values(testResults).filter(Boolean).length;
            const total = Object.keys(testResults).length;
            
            console.log(`✅ Tests Passed: ${passed}/${total}`);
            console.log(`🔧 Server Start: ${testResults.serverStart ? '✅' : '❌'}`);
            console.log(`📋 Tools List: ${testResults.toolsList ? '✅' : '❌'}`);
            console.log(`📁 Path Resolution: ${testResults.pathsResolved ? '✅' : '❌'}`);
            console.log(`🗄️  Memory Bank List: ${testResults.memoryBankList ? '✅' : '❌'}`);
            
            if (passed === total) {
              console.log('\n🎉 All path configuration fixes successful!');
              console.log('🔄 You should restart Cursor to pick up the fixed server.');
            } else if (passed >= 2) {
              console.log('\n⚠️  Partial success - some improvements made.');
              console.log('🔄 Try restarting Cursor to test with the updated server.');
            } else {
              console.log('\n❌ Path configuration issues persist.');
              console.log('🔍 Check the logged paths and server messages above.');
            }
            
            server.kill();
            process.exit(passed >= 2 ? 0 : 1);
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
  console.error('\n⏱️  Test timeout - server not responding fully');
  console.log('🔄 Try restarting Cursor anyway to test the fixes');
  server.kill();
  process.exit(1);
}, 10000); 