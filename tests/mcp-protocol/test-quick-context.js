import { spawn } from 'child_process';

async function quickTest() {
  console.log('🔍 Quick get_context test...\n');

  const server = spawn('node', ['dist/server.js'], {
    stdio: 'pipe',
    cwd: process.cwd()
  });

  let output = '';
  
  server.stdout.on('data', (data) => {
    output += data.toString();
    console.log('📥 Server output:', data.toString());
  });

  server.stderr.on('data', (data) => {
    console.log('🔍 Server stderr:', data.toString());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Send init
  const initMsg = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" }
    }
  };
  
  console.log('📤 Sending init...');
  server.stdin.write(JSON.stringify(initMsg) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test get_context
  const contextMsg = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "get_context",
      arguments: {
        query: "test",
        max_tokens: 500
      }
    }
  };

  console.log('📤 Sending get_context...');
  server.stdin.write(JSON.stringify(contextMsg) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 2000));

  server.kill();
  console.log('\n✅ Test completed');
}

quickTest().catch(console.error); 