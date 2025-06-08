#!/usr/bin/env node

import { spawn } from 'child_process';

async function testCreateMemoryBank() {
  console.log('🧪 Testing Memory Bank Creation with Direct Integration...\n');

  const server = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let responseData = '';
  let finalResponse = null;

  server.stderr.on('data', (data) => {
    console.log('🔍 Server Log:', data.toString().trim());
  });

  server.stdout.on('data', (data) => {
    responseData += data.toString();
    // A single response is expected, try to parse it once complete
    try {
      // Assuming response ends with a newline
      if (responseData.includes('\n')) {
        const responses = responseData.trim().split('\n');
        const lastResponse = responses[responses.length - 1];
        finalResponse = JSON.parse(lastResponse);
        console.log(`✅ Received Response:`, JSON.stringify(finalResponse, null, 2));
      }
    } catch (e) {
      // In case of partial JSON, wait for more data
    }
  });

  server.on('error', (error) => {
    console.error('💥 Server Process Error:', error);
  });

  server.on('close', (code) => {
    console.log(`\n🛑 Server process exited with code ${code}`);
  });

  // Wait for server to initialize
  console.log('⏳ Waiting for server initialization (3s)...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const uniqueName = `test-direct-${Date.now()}`;
    console.log(`\n📤 Creating new memory bank: '${uniqueName}'...`);
    
    const createRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'create_memory_bank',
        arguments: {
          name: uniqueName,
          description: 'Test bank to verify direct integration',
          sources: [
            {
              type: 'text',
              path: 'This is a test of the new direct integration. It should be much faster than the old subprocess method.'
            }
          ],
          tags: ['test', 'direct-integration']
        }
      }
    };

    server.stdin.write(JSON.stringify(createRequest) + '\n');
    console.log('📤 Request sent.');

    // Wait for memory bank creation (should be fast now)
    console.log('⏳ Waiting for creation response (10s)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log(`\n📊 Test Summary:`);
    if (finalResponse) {
      console.log('   ✅ Test finished successfully.');
      console.log('   Final Response:', JSON.stringify(finalResponse, null, 2));
    } else {
      console.log('   ❌ Test did not receive a final response.');
      console.log('   Raw data buffer:', responseData);
    }

  } catch (error) {
    console.error('💥 Test Error:', error);
  } finally {
    if (!server.killed) {
      console.log('\n🛑 Terminating server...');
      server.kill();
    }
  }
}

testCreateMemoryBank().catch(console.error); 