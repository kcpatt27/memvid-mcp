import { spawn } from 'child_process';

async function testMCPMode() {
  console.log('🧪 Testing MCP mode detection in setup script...\n');
  
  // Simulate how Cursor would call the script (with piped stdio, no TTY)
  const serverProcess = spawn('node', ['dist/setup.js'], { 
    stdio: ['pipe', 'pipe', 'pipe'] // No TTY
  });
  
  let serverStarted = false;
  let receivedMCPResponse = false;
  
  // Check if server starts (should see MCP initialization logs)
  serverProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.log('📋 Server stderr:', text);
    
    if (text.includes('MemVid MCP Server running on stdio')) {
      serverStarted = true;
      console.log('✅ Server started in MCP mode!');
      
      // Send a tools/list request
      setTimeout(() => {
        console.log('📤 Sending tools/list request...');
        const request = JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        }) + '\n';
        
        serverProcess.stdin.write(request);
      }, 1000);
    }
  });
  
  // Check for MCP responses on stdout
  serverProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log('📨 Server stdout:', text);
    
    try {
      const lines = text.split('\n').filter(line => line.trim());
      for (const line of lines) {
        const response = JSON.parse(line);
        if (response.result?.tools) {
          console.log(`✅ SUCCESS: MCP server responded with ${response.result.tools.length} tools:`);
          response.result.tools.forEach((tool, i) => {
            console.log(`  ${i+1}. ${tool.name}`);
          });
          receivedMCPResponse = true;
          cleanup();
          return;
        }
      }
    } catch (parseError) {
      // Not JSON, might be setup output instead
      if (text.includes('MemVid MCP Server Setup')) {
        console.log('❌ FAILED: Setup mode instead of server mode');
        console.log('   The script should detect no TTY and start server directly');
        cleanup();
      }
    }
  });
  
  function cleanup() {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
    }
  }
  
  // Timeout after 10 seconds
  setTimeout(() => {
    if (!receivedMCPResponse) {
      console.log('❌ TIMEOUT: Expected MCP response not received');
      if (serverStarted) {
        console.log('   Server started but no tools response');
      } else {
        console.log('   Server may not have started in MCP mode');
      }
      cleanup();
      process.exit(1);
    }
  }, 10000);
}

testMCPMode().catch(console.error); 