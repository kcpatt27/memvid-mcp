import { spawn } from 'child_process';

async function testDirectJSONRPC() {
  console.log('🧪 Testing direct JSON-RPC communication with MCP server (--mcp mode)...\n');
  
  const serverPath = './dist/server.js';
  // Force MCP mode with --mcp flag
  const serverProcess = spawn('node', [serverPath, '--mcp'], { stdio: ['pipe', 'pipe', 'pipe'] });
  
  let responseReceived = false;
  
  // Set up response handler
  serverProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log('📨 Server response:');
    console.log(text);
    
    try {
      const lines = text.split('\n').filter(line => line.trim());
      for (const line of lines) {
        const response = JSON.parse(line);
        if (response.result?.tools) {
          console.log(`\n✅ SUCCESS: Found ${response.result.tools.length} tools:`);
          response.result.tools.forEach((tool, i) => {
            console.log(`  ${i+1}. ${tool.name} - ${tool.description}`);
          });
          responseReceived = true;
          cleanup();
          return;
        }
      }
    } catch (parseError) {
      // Response might not be JSON, or might be partial
      console.log('   (Not JSON or partial response)');
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.log('📋 Server logs:', data.toString());
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Server error:', error);
    cleanup();
  });
  
  function cleanup() {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
    }
  }
  
  // Wait for server to initialize
  setTimeout(() => {
    console.log('📤 Sending tools/list request...');
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };
    
    const requestStr = JSON.stringify(request) + '\n';
    console.log('📤 Request:', requestStr.trim());
    
    serverProcess.stdin.write(requestStr);
  }, 3000); // Give server time to initialize
  
  // Timeout after 10 seconds
  setTimeout(() => {
    if (!responseReceived) {
      console.log('❌ TIMEOUT: No valid response received after 10 seconds');
      console.log('This suggests the server is not responding to MCP requests properly');
      cleanup();
      process.exit(1);
    }
  }, 10000);
}

testDirectJSONRPC().catch(console.error); 