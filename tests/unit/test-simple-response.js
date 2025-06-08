#!/usr/bin/env node

import { spawn } from 'child_process';

async function testSimpleResponse() {
  console.log('🔍 Testing basic server response handling...\n');

  const server = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let responseData = '';
  let responses = [];

  server.stderr.on('data', (data) => {
    const logData = data.toString().trim();
    console.log('📋 Server Error/Log:', logData);
  });

  server.stdout.on('data', (data) => {
    const chunk = data.toString();
    console.log('📋 Server Output:', chunk);
    responseData += chunk;
    
    // Parse complete JSON-RPC responses
    const lines = responseData.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const response = JSON.parse(line);
          responses.push(response);
          console.log(`✅ Response ${responses.length} received:`, JSON.stringify(response, null, 2));
        } catch (e) {
          console.log('❌ Parse error for line:', line);
        }
      }
    }
    responseData = lines[lines.length - 1];
  });

  // Wait for server initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    console.log('\n🔍 Test 1: Basic tools/list request...');
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };

    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🔍 Test 2: Create memory bank request...');
    const createBankRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'create_memory_bank',
        arguments: {
          name: 'response-test',
          documents: [
            { content: 'test document content', metadata: { type: 'test' } }
          ]
        }
      }
    };

    server.stdin.write(JSON.stringify(createBankRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log(`\n📊 Total responses received: ${responses.length}`);
    if (responses.length === 0) {
      console.log('❌ No responses received - checking server implementation...');
    }

  } catch (error) {
    console.error('❌ Test Error:', error);
  } finally {
    console.log('\n🔄 Cleaning up...');
    server.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testSimpleResponse().catch(console.error); 