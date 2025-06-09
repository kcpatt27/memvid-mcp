import { spawn } from 'child_process';

async function testMCPTools() {
  console.log('Testing MemVid MCP Server...');
  
  // Force MCP mode with --mcp flag
  const server = spawn('node', ['dist/server.js', '--mcp'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let responses = [];
  let serverLogs = [];
  
  // Collect server output
  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('STDOUT:', output);
    
    const lines = output.split('\\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
        console.log('JSON Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('Non-JSON stdout:', line);
      }
    }
  });
  
  server.stderr.on('data', (data) => {
    const log = data.toString();
    serverLogs.push(log);
    console.log('STDERR:', log);
  });
  
  server.on('exit', (code, signal) => {
    console.log(`Server exited with code ${code}, signal ${signal}`);
  });
  
  server.on('error', (error) => {
    console.log('Server error:', error);
  });
  
  // Give server time to start up
  setTimeout(() => {
    console.log('\\n--- Sending initialization message ---');
    const initMessage = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        }
      }
    };
    
    server.stdin.write(JSON.stringify(initMessage) + '\\n');
    console.log('Sent:', JSON.stringify(initMessage));
  }, 2000);
  
  // Wait for initialization response, then request tools
  setTimeout(() => {
    console.log('\\n--- Sending tools list request ---');
    const toolsMessage = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    };
    server.stdin.write(JSON.stringify(toolsMessage) + '\\n');
    console.log('Sent:', JSON.stringify(toolsMessage));
  }, 4000);
  
  // Final results
  setTimeout(() => {
    console.log('\\n=== TEST RESULTS ===');
    console.log(`Responses received: ${responses.length}`);
    console.log(`Server logs: ${serverLogs.length} entries`);
    
    if (responses.length >= 2) {
      const initResponse = responses[0];
      const toolsResponse = responses[1];
      
      console.log('✅ Server responded to initialization');
      console.log('✅ Server capabilities:', JSON.stringify(initResponse.result?.capabilities, null, 2));
      
      if (toolsResponse.result?.tools && toolsResponse.result.tools.length > 0) {
        console.log(`✅ Found ${toolsResponse.result.tools.length} tools:`);
        toolsResponse.result.tools.forEach(tool => {
          console.log(`  - ${tool.name}: ${tool.description}`);
        });
      } else {
        console.log('❌ No tools found!');
      }
    } else {
      console.log('❌ Server did not respond properly');
      console.log('All responses:', responses);
    }
    
    server.kill();
    process.exit(0);
  }, 6000);
  
  // Timeout after 8 seconds
  setTimeout(() => {
    console.log('❌ Test timed out');
    server.kill();
    process.exit(1);
  }, 8000);
}

testMCPTools(); 