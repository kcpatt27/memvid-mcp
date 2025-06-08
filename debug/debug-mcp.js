import { spawn } from 'child_process';

console.log('🚀 Testing MCP server startup...');

const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let hasResponded = false;

// Listen for any output on stdout (where MCP messages should go)
server.stdout.on('data', (data) => {
  hasResponded = true;
  console.log('📤 Server stdout:', data.toString());
});

// Listen for any logs on stderr
server.stderr.on('data', (data) => {
  console.log('📋 Server log:', data.toString());
});

// Send a simple MCP request after 2 seconds
setTimeout(() => {
  console.log('📤 Sending initialize request...');
  const initMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };
  
  server.stdin.write(JSON.stringify(initMessage) + '\n');
}, 2000);

// Kill server and report after 5 seconds
setTimeout(() => {
  if (!hasResponded) {
    console.log('❌ Server did not respond to initialize request');
  } else {
    console.log('✅ Server responded');
  }
  server.kill();
}, 5000);

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
}); 