#!/usr/bin/env node

import { spawn } from 'child_process';

async function testListBanks() {
  console.log('🚀 Testing List Memory Banks...\n');

  const server = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let responseData = '';
  let responses = [];

  server.stderr.on('data', (data) => {
    const logData = data.toString().trim();
    if (logData.includes('[INFO]')) {
      console.log('📋 Server:', logData.split('] ')[1] || logData);
    }
  });

  server.stdout.on('data', (data) => {
    const chunk = data.toString();
    responseData += chunk;
    
    // Parse complete JSON-RPC responses
    const lines = responseData.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const response = JSON.parse(line);
          responses.push(response);
          console.log(`✅ Response ${responses.length} received`);
          if (response.result) {
            const result = JSON.parse(response.result.content[0].text);
            console.log('   Banks found:', JSON.stringify(result, null, 2));
          }
        } catch (e) {
          // Ignore parsing errors for incomplete responses
        }
      }
    }
    responseData = lines[lines.length - 1];
  });

  // Wait for server initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    console.log('\n🔍 Test: List all memory banks...');
    const listRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'list_memory_banks',
        arguments: {
          include_stats: true
        }
      }
    };

    server.stdin.write(JSON.stringify(listRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`\n🎉 LIST MEMORY BANKS TESTING COMPLETED!`);
    console.log(`📊 Total responses received: ${responses.length}`);

  } catch (error) {
    console.error('❌ Test Error:', error);
  } finally {
    console.log('\n🔄 Cleaning up...');
    server.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testListBanks().catch(console.error); 