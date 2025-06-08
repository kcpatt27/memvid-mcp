import { spawn } from 'child_process';

console.log('🚀 Testing detailed MCP protocol...');

const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let rawStdout = '';

server.stdout.on('data', (data) => {
  const chunk = data.toString();
  rawStdout += chunk;
  console.log('📤 Raw stdout chunk:', JSON.stringify(chunk));
  
  // Try to parse complete JSON messages
  const lines = rawStdout.split('\n');
  rawStdout = lines.pop() || ''; // Keep incomplete line
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line.trim());
        console.log('📥 Parsed response:', response);
      } catch (e) {
        console.log('❌ Failed to parse:', line.trim());
      }
    }
  }
});

server.stderr.on('data', (data) => {
  console.log('📋 Server log:', data.toString().trim());
});

// Send initialize request after 2 seconds
setTimeout(() => {
  console.log('📤 Sending initialize request...');
  const initRequest = {
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
  
  const message = JSON.stringify(initRequest) + '\n';
  console.log('📤 Sending message:', JSON.stringify(message));
  server.stdin.write(message);
}, 2000);

// Kill after 8 seconds
setTimeout(() => {
  console.log('⏰ Timeout - killing server');
  server.kill();
}, 8000);

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
}); 