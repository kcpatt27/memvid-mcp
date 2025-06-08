#!/usr/bin/env node

/**
 * Simple test script for MemVid MCP Server
 * This script tests the core functionality by simulating MCP tool calls
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPTester {
  constructor() {
    this.serverProcess = null;
    this.requestId = 0;
  }

  generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  async startServer() {
    console.log('🚀 Starting MemVid MCP Server...');
    
    this.serverProcess = spawn('node', ['dist/server.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    this.serverProcess.stderr.on('data', (data) => {
      console.log('❌ Server error:', data.toString().trim());
    });

    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (this.serverProcess.killed) {
      throw new Error('Server failed to start');
    }
    
    console.log('✅ Server started successfully');
  }

  async sendRequest(method, params = {}) {
    const request = {
      jsonrpc: "2.0",
      id: ++this.requestId,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      let responseData = '';
      let errorData = '';

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);

      this.serverProcess.stdout.once('data', (data) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data.toString()}`));
        }
      });

      this.serverProcess.stdin.write(JSON.stringify(request) + '\\n');
    });
  }

  async runTests() {
    try {
      await this.startServer();

      // Test 1: List available tools
      console.log('\\n📋 Test 1: Listing available tools...');
      const toolsResponse = await this.sendRequest('tools/list');
      console.log('✅ Available tools:', toolsResponse.result?.tools?.map(t => t.name) || []);

      // Test 2: Create memory bank
      console.log('\\n🏦 Test 2: Creating memory bank...');
      const bankName = `test-bank-${this.generateId()}`;
      const createResponse = await this.sendRequest('tools/call', {
        name: 'create_memory_bank',
        arguments: {
          name: bankName,
          description: 'Test memory bank for validation',
          sources: [
            {
              type: 'directory',
              path: path.join(__dirname, 'test-data'),
              options: { file_types: ['.ts', '.md'] }
            }
          ],
          tags: ['test', 'validation']
        }
      });
      console.log('💾 Create result:', createResponse.result);

      // Test 3: List memory banks
      console.log('\\n📚 Test 3: Listing memory banks...');
      const listResponse = await this.sendRequest('tools/call', {
        name: 'list_memory_banks'
      });
      console.log('📋 Memory banks:', listResponse.result);

      // Test 4: Search memory bank
      console.log('\\n🔍 Test 4: Searching memory bank...');
      const searchResponse = await this.sendRequest('tools/call', {
        name: 'search_memory',
        arguments: {
          bank_name: bankName,
          query: 'TypeScript',
          top_k: 3
        }
      });
      console.log('🔎 Search results:', searchResponse.result);

      console.log('\\n✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      if (this.serverProcess && !this.serverProcess.killed) {
        this.serverProcess.kill();
      }
    }
  }
}

// Run tests if this script is executed directly
const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  const tester = new MCPTester();
  tester.runTests().catch(console.error);
}

export default MCPTester; 