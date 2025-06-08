#!/usr/bin/env node

import { spawn } from 'child_process';

async function testDetailedDebug() {
  console.log('🧪 Testing with Detailed Debug Logging...\\n');

  const server = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let responseData = '';

  server.stderr.on('data', (data) => {
    console.log('🔍 Server Log:', data.toString().trim());
  });

  server.stdout.on('data', (data) => {
    const chunk = data.toString();
    responseData += chunk;
    console.log('📡 Server Response Chunk:', JSON.stringify(chunk));
    
    // Check if we received a complete JSON response
    try {
      const lines = responseData.split('\\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('{')) {
          const response = JSON.parse(line);
          console.log('✅ Complete Response:', JSON.stringify(response, null, 2));
        }
      }
    } catch {
      // Not yet a complete JSON response
    }
  });

  server.on('error', (error) => {
    console.error('💥 Server Error:', error);
  });

  // Wait for server to initialize
  console.log('⏳ Waiting for server initialization...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // Test creating a new memory bank with unique name
    const uniqueName = `debug-detailed-${Date.now()}`;
    console.log(`\\n📨 Testing memory bank creation: ${uniqueName}`);
    
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    };

    console.log('📤 Sending init...');
    server.stdin.write(JSON.stringify(initRequest) + '\\n');

    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    const createRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'create_memory_bank',
        arguments: {
          name: uniqueName,
          sources: [
            {
              type: 'text',
              path: 'temp_text_0.txt'
            }
          ],
          description: 'Debug test bank'
        }
      }
    };

    console.log('📤 Sending create memory bank request...');
    server.stdin.write(JSON.stringify(createRequest) + '\\n');

    // Wait up to 90 seconds for response (longer than timeout)
    console.log('⏳ Waiting for memory bank creation (up to 90 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 90000));

  } catch (error) {
    console.error('💥 Test Error:', error);
  } finally {
    console.log('\\n🛑 Terminating test...');
    server.kill();
  }
}

testDetailedDebug().catch(console.error); 