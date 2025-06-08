#!/usr/bin/env node

import { spawn } from 'child_process';

async function debugSearchMemory() {
  console.log('🔍 Debugging search_memory tool execution...\n');

  const server = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let responseData = '';
  let responses = [];

  server.stderr.on('data', (data) => {
    const logData = data.toString().trim();
    console.log('📋 Server Log:', logData);
  });

  server.stdout.on('data', (data) => {
    const chunk = data.toString();
    console.log('📋 Server Output Chunk:', JSON.stringify(chunk));
    responseData += chunk;
    
    // Parse complete JSON-RPC responses
    const lines = responseData.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const response = JSON.parse(line);
          responses.push(response);
          console.log(`✅ Complete Response ${responses.length} received!`);
          console.log('Response content:', JSON.stringify(response, null, 2));
        } catch (e) {
          console.log('❌ Parse error for line:', JSON.stringify(line));
        }
      }
    }
    responseData = lines[lines.length - 1];
  });

  // Wait for server initialization
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    console.log('\n🔍 Testing search_memory tool...');
    const searchRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'test'
        }
      }
    };

    console.log('Sending request:', JSON.stringify(searchRequest, null, 2));
    server.stdin.write(JSON.stringify(searchRequest) + '\n');
    
    // Wait longer to see if response comes back
    console.log('Waiting for response...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log(`\n📊 Total responses received: ${responses.length}`);
    
    if (responses.length === 0) {
      console.log('❌ No responses received - search tool may be hanging');
      console.log('📋 Current responseData buffer:', JSON.stringify(responseData));
    }

  } catch (error) {
    console.error('❌ Test Error:', error);
  } finally {
    console.log('\n🔄 Cleaning up...');
    server.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

debugSearchMemory().catch(console.error); 