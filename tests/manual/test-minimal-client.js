#!/usr/bin/env node

import { spawn } from 'child_process';

async function testMinimalMCP() {
  console.log('🧪 Testing Minimal MCP Server...\n');

  const server = spawn('node', ['test-minimal-mcp.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let responseData = '';
  let responses = [];

  server.stderr.on('data', (data) => {
    console.log('🔍 Server Debug:', data.toString().trim());
  });

  server.stdout.on('data', (data) => {
    const chunk = data.toString();
    responseData += chunk;
    console.log('📡 Raw Response Chunk:', JSON.stringify(chunk));
    
    // Try to parse complete JSON-RPC responses
    const lines = responseData.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const response = JSON.parse(line);
          responses.push(response);
          console.log(`✅ Parsed Response ${responses.length}:`, JSON.stringify(response, null, 2));
        } catch (e) {
          console.log('❌ Failed to parse JSON:', line);
        }
      }
    }
    // Keep the last potentially incomplete line
    responseData = lines[lines.length - 1];
  });

  server.on('error', (error) => {
    console.error('💥 Server Process Error:', error);
  });

  server.on('close', (code) => {
    console.log(`🛑 Server process exited with code ${code}`);
  });

  // Wait for server to initialize
  console.log('⏳ Waiting for server initialization...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    console.log('\n📤 Sending list tools request...');
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };

    server.stdin.write(JSON.stringify(request) + '\n');
    console.log('📤 Request sent:', JSON.stringify(request));

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`\n📊 Final Summary:`);
    console.log(`   Responses received: ${responses.length}`);
    console.log(`   Raw data buffer: ${JSON.stringify(responseData)}`);

  } catch (error) {
    console.error('💥 Test Error:', error);
  } finally {
    console.log('\n🛑 Terminating test...');
    server.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testMinimalMCP().catch(console.error); 