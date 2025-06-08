#!/usr/bin/env node

import { spawn } from 'child_process';

async function testMCPProtocol() {
  console.log('🧪 Testing MCP Protocol Communication...\n');

  const server = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let responseReceived = false;

  server.stderr.on('data', (data) => {
    console.log('Server stderr:', data.toString().trim());
  });

  server.stdout.on('data', (data) => {
    console.log('Server response:', data.toString().trim());
    responseReceived = true;
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
  });

  // Wait for server to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Test 1: Send initialization
    console.log('📡 Sending initialization...');
    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize", 
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          roots: {
            listChanged: true
          }
        },
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        }
      }
    };
    
    server.stdin.write(JSON.stringify(initRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: List tools
    console.log('\n🔧 Requesting tool list...');
    const listToolsRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    };
    
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Call create_memory_bank with unique name
    console.log('\n📚 Testing create_memory_bank with unique name...');
    const uniqueName = `test-bank-${Date.now()}`;
    const createBankRequest = {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "create_memory_bank",
        arguments: {
          name: uniqueName,
          description: "Test bank with unique name",
          sources: [
            {
              type: "text", 
              path: "Test content for memory bank"
            }
          ],
          tags: ["test"]
        }
      }
    };
    
    server.stdin.write(JSON.stringify(createBankRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 4: Try duplicate name
    console.log('\n🔄 Testing duplicate name scenario...');
    const duplicateRequest = {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call", 
      params: {
        name: "create_memory_bank",
        arguments: {
          name: "test-project", // This should already exist
          description: "Testing duplicate name",
          sources: [
            {
              type: "text",
              path: "Duplicate test content"
            }
          ],
          tags: ["duplicate", "test"]
        }
      }
    };
    
    server.stdin.write(JSON.stringify(duplicateRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    console.error('❌ Test error:', error);
  }

  console.log('\n🛑 Terminating test...');
  server.kill();
  
  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`Response received: ${responseReceived}`);
}

testMCPProtocol().catch(console.error); 