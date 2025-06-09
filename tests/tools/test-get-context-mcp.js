import { spawn } from 'child_process';

console.log('🔍 Testing get_context via MCP...');

const server = spawn('node', ['index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let responseBuffer = '';
const responses = [];

function sendMessage(message) {
  const jsonMessage = JSON.stringify(message) + '\n';
  console.log('📤 Sending:', JSON.stringify(message));
  server.stdin.write(jsonMessage);
}

function processMessage(msg) {
  try {
    const data = JSON.parse(msg);
    console.log('📥 Received:', JSON.stringify(data, null, 2));
    responses.push(data);
    return data;
  } catch (e) {
    console.log('📥 Non-JSON:', msg);
    return null;
  }
}

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  // Process complete lines
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop(); // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      processMessage(line.trim());
    }
  }
});

server.stderr.on('data', (data) => {
  console.log('🔍 Server log:', data.toString().trim());
});

// Test sequence
setTimeout(() => {
  // Initialize
  sendMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" }
    }
  });
}, 100);

setTimeout(() => {
  // List tools
  sendMessage({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  });
}, 1000);

setTimeout(() => {
  // Test get_context
  sendMessage({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "mcp_memvid_get_context",
      arguments: {
        query: "test",
        max_tokens: 500,
        include_metadata: true
      }
    }
  });
}, 2000);

setTimeout(() => {
  console.log('\n=== FINAL RESULTS ===');
  const getContextResponse = responses.find(r => r.id === 3);
  
  if (getContextResponse && getContextResponse.result) {
    console.log('✅ get_context tool working successfully!');
    console.log('📊 Response preview:', getContextResponse.result.substring ? getContextResponse.result.substring(0, 200) + '...' : getContextResponse.result);
  } else if (getContextResponse && getContextResponse.error) {
    console.log('❌ get_context tool returned error:', getContextResponse.error);
  } else {
    console.log('❌ get_context tool did not respond properly');
  }
  
  server.kill();
  process.exit(0);
}, 5000); 