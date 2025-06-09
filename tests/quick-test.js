import { spawn } from 'child_process';

async function testMCP() {
  const server = spawn('node', ['dist/server.js']);
  
  const messages = [
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" }
      }
    }),
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    })
  ];
  
  let responseCount = 0;
  
  server.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        if (response.jsonrpc === "2.0") {
          console.log(`Response ${response.id}:`, JSON.stringify(response, null, 2));
          responseCount++;
          if (responseCount === 2) {
            server.kill();
            process.exit(0);
          }
        }
      } catch (e) {
        // Ignore non-JSON lines (logs)
      }
    }
  });
  
  server.stderr.on('data', (data) => {
    // Ignore stderr for now
  });
  
  // Send messages
  for (const message of messages) {
    server.stdin.write(message + '\n');
  }
  
  setTimeout(() => {
    console.log('Test timeout');
    server.kill();
    process.exit(1);
  }, 10000);
}

testMCP().catch(console.error); 