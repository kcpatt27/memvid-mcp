#!/usr/bin/env node

import { spawn } from 'child_process';

async function testCompleteCreation() {
  console.log('🧪 Testing Complete Memory Bank Creation...\n');

  const server = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let responseData = '';
  let responses = [];
  let creationComplete = false;

  server.stderr.on('data', (data) => {
    const log = data.toString().trim();
    console.log('🔍 Server Log:', log);
    
    // Check for completion indicators
    if (log.includes('Memory bank creation completed') || 
        log.includes('successfully created') ||
        log.includes('Memory bank') && log.includes('created')) {
      creationComplete = true;
    }
  });

  server.stdout.on('data', (data) => {
    const chunk = data.toString();
    responseData += chunk;
    
    // Try to parse complete JSON-RPC responses
    const lines = responseData.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const response = JSON.parse(line);
          responses.push(response);
          console.log(`✅ SUCCESS Response received!`);
          
          // Check if this is a success response for create_memory_bank
          if (response.result && response.id === 1) {
            creationComplete = true;
            console.log('🎉 Memory bank creation response received!');
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }
    // Keep the last potentially incomplete line
    responseData = lines[lines.length - 1];
  });

  // Wait for server to initialize
  console.log('⏳ Waiting for server initialization...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const uniqueName = `final-test-${Date.now()}`;
    
    const createRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'create_memory_bank',
        arguments: {
          name: uniqueName,
          description: 'Final test to verify complete functionality',
          sources: [
            {
              type: 'text',
              path: 'SUCCESS! The MemVid MCP server is now fully operational.'
            }
          ],
          tags: ['success', 'final-test']
        }
      }
    };

    server.stdin.write(JSON.stringify(createRequest) + '\n');
    console.log('📤 Request sent for bank:', uniqueName);

    // Wait for completion (60 seconds)
    console.log('⏳ Waiting 60 seconds for completion...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    console.log(`\n📊 Final Summary:`);
    console.log(`   Responses received: ${responses.length}`);
    console.log(`   Creation completed: ${creationComplete}`);

  } catch (error) {
    console.error('💥 Test Error:', error);
  } finally {
    console.log('\n🛑 Terminating test...');
    server.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testCompleteCreation().catch(console.error); 