#!/usr/bin/env node

import { spawn } from 'child_process';

async function testFixed() {
  console.log('🧪 Testing Fixed MCP Server...\n');

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

    // Test 2: Call create_memory_bank with unique name
    console.log('\n📚 Testing create_memory_bank with unique timestamp...');
    const uniqueName = `fixed-test-${Date.now()}`;
    const createBankRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "create_memory_bank",
        arguments: {
          name: uniqueName,
          description: "Testing the fixed execution",
          sources: [
            {
              type: "text", 
              path: "This is test content for the fixed memory bank execution."
            }
          ],
          tags: ["fixed", "test"]
        }
      }
    };
    
    server.stdin.write(JSON.stringify(createBankRequest) + '\n');
    
    // Wait longer for the response
    console.log('⏳ Waiting for response (up to 30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ Test error:', error);
  }

  console.log('\n🛑 Terminating test...');
  server.kill();
  
  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`\nResponse received: ${responseReceived}`);
}

testFixed().catch(console.error); 