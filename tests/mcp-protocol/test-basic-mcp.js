#!/usr/bin/env node

import { spawn } from 'child_process';

async function testBasicMCP() {
  console.log('🧪 Testing Basic MCP Communication...\\n');

  const server = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let responseData = '';
  let responses = [];

  server.stderr.on('data', (data) => {
    console.log('🔍 Server Log:', data.toString().trim());
  });

  server.stdout.on('data', (data) => {
    const chunk = data.toString();
    responseData += chunk;
    console.log('📡 Raw Chunk:', JSON.stringify(chunk));
    
    // Try to parse complete JSON-RPC responses
    const lines = responseData.split('\\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const response = JSON.parse(line);
          responses.push(response);
          console.log(`✅ Response ${responses.length}:`, JSON.stringify(response, null, 2));
        } catch (e) {
          console.log('❌ Invalid JSON:', line);
        }
      }
    }
    // Keep the last potentially incomplete line
    responseData = lines[lines.length - 1];
  });

  server.on('error', (error) => {
    console.error('💥 Server Error:', error);
  });

  // Wait for server to initialize
  console.log('⏳ Waiting for server initialization...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    console.log('\\n📤 Step 1: Testing list tools...');
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };

    server.stdin.write(JSON.stringify(listToolsRequest) + '\\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\\n📤 Step 2: Testing tool call...');
    const listBanksRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_memory_banks',
        arguments: {}
      }
    };

    server.stdin.write(JSON.stringify(listBanksRequest) + '\\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log(`\\n📊 Summary: Received ${responses.length} responses`);

  } catch (error) {
    console.error('💥 Test Error:', error);
  } finally {
    console.log('\\n🛑 Terminating test...');
    server.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testBasicMCP().catch(console.error); 