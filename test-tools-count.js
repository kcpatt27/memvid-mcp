const { spawn } = require('child_process');

console.log('Testing MCP server tool count...');

const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

setTimeout(() => {
  const listTools = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  });
  
  server.stdin.write(listTools + '\n');
}, 500);

server.stdout.on('data', (data) => {
  try {
    const lines = data.toString().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        
        if (response.result?.tools) {
          console.log(`Found ${response.result.tools.length} tools:`);
          response.result.tools.forEach((tool, i) => {
            console.log(`  ${i+1}. ${tool.name}`);
          });
          
          server.kill();
          process.exit(0);
        }
      } catch (parseError) {
        // Skip non-JSON lines
      }
    }
  } catch (error) {
    console.error('Error parsing response:', error);
  }
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

setTimeout(() => {
  console.error('Timeout: Server did not respond in time');
  server.kill();
  process.exit(1);
}, 5000); 