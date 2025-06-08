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

      this.server.stdout.on('data', (data) => {
        try {
          const messages = data.toString().trim().split('\n').filter(line => line.trim());
          
          for (const message of messages) {
            console.log(`🔥 Raw server output: ${message}`);
            
            try {
              const parsed = JSON.parse(message);
              console.log(`📥 Parsed response:`, JSON.stringify(parsed, null, 2));
              
              if (parsed.id && this.pendingRequests.has(parsed.id)) {
                const { resolve: resolveRequest } = this.pendingRequests.get(parsed.id);
                this.pendingRequests.delete(parsed.id);
                resolveRequest(parsed);
              }
            } catch (parseError) {
              console.log(`⚠️ Failed to parse server output as JSON: ${parseError.message}`);
            }
          }
        } catch (error) {
          console.error('Error processing server output:', error);
        }
      });

      this.server.on('error', (error) => {
        console.error('❌ Server error:', error);
        reject(error);
      });

      // Give server time to start
      setTimeout(() => {
        console.log('✅ Server connection established');
        resolve();
      }, 2000);
    });
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const requestId = this.requestId++;
      const request = {
        jsonrpc: '2.0',
        id: requestId,
        method,
        params
      };

      console.log(`📤 Sending request:`, JSON.stringify(request, null, 2));
      
      this.pendingRequests.set(requestId, { resolve, reject });
      
      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request ${requestId} timed out after 10 seconds`));
        }
      }, 10000);

      this.server.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async listMemoryBanks(includeStats = false) {
    return await this.sendRequest('tools/call', {
      name: 'list_memory_banks',
      arguments: { include_stats: includeStats }
    });
  }

  async disconnect() {
    if (this.server) {
      this.server.kill();
      this.server = null;
    }
  }
}

async function testListMemoryBanks() {
  const client = new MCPClient();
  
  try {
    console.log('🚀 Debug List Memory Banks Test...\n');

    await client.connect();

    console.log('🔍 Test: List memory banks with stats...');
    const response = await client.listMemoryBanks(true);
    
    console.log('🎉 Response received:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\n🔄 Cleaning up...');
    await client.disconnect();
  }
}

testListMemoryBanks().catch(console.error); 