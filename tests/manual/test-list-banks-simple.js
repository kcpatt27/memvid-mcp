import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPClient {
  constructor() {
    this.server = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Starting MCP server...');
      
      this.server = spawn('node', ['dist/server.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
        cwd: __dirname
      });

      this.server.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`📋 Server: ${output}`);
        }
      });

      // Set up response handling
      this.server.stdout.on('data', (data) => {
        try {
          const lines = data.toString().split('\n').filter(line => line.trim());
          for (const line of lines) {
            const response = JSON.parse(line);
            console.log('📨 Response received:', JSON.stringify(response, null, 2));
            
            if (response.id && this.pendingRequests.has(response.id)) {
              const { resolve } = this.pendingRequests.get(response.id);
              this.pendingRequests.delete(response.id);
              resolve(response);
            }
          }
        } catch (error) {
          console.log('📨 Raw response:', data.toString());
        }
      });

      setTimeout(() => {
        console.log('✅ Server connection established');
        resolve();
      }, 2000);
    });
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      console.log('📤 Sending request:', JSON.stringify(request, null, 2));

      this.pendingRequests.set(id, { resolve, reject });
      
      // Set timeout for this specific request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${id} timed out after 10 seconds`));
        }
      }, 10000);

      this.server.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async disconnect() {
    if (this.server) {
      this.server.kill();
    }
  }
}

async function main() {
  console.log('🚀 Simple List Memory Banks Test (no stats)...\n');
  
  const client = new MCPClient();
  
  try {
    await client.connect();
    
    console.log('🔍 Test: List memory banks WITHOUT stats...');
    const response = await client.sendRequest('tools/call', {
      name: 'list_memory_banks',
      arguments: {
        include_stats: false
      }
    });
    
    console.log('✅ Test passed! Response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\n🔄 Cleaning up...');
    await client.disconnect();
  }
}

main().catch(console.error); 