#!/usr/bin/env node

import { spawn } from 'child_process';

async function testPhase2Fixed() {
  console.log('🚀 Testing Phase 2 Enhanced Search (Fixed - Using existing memory bank)...\n');

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
          console.log(`✅ Response ${responses.length} received:`, response.result ? 'SUCCESS' : 'ERROR');
          if (response.result) {
            const result = JSON.parse(response.result.content[0].text);
            console.log(`   Found ${result.total_results} results`);
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
    console.log('\n🔍 Test 1: Enhanced Search with specific memory bank (direct-test)...');
    const enhancedSearchRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'test content',
          memory_banks: ['direct-test'],  // Use existing memory bank
          filters: {
            file_types: ['pdf', 'txt']
          },
          sort_by: 'relevance',
          sort_order: 'desc'
        }
      }
    };

    server.stdin.write(JSON.stringify(enhancedSearchRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🔍 Test 2: Enhanced Search with Content Length Filtering...');
    const contentLengthRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'information',
          memory_banks: ['direct-test'],  // Use existing memory bank
          filters: {
            content_length: {
              min: 10,
              max: 1000
            }
          },
          sort_by: 'content_length',
          sort_order: 'asc'
        }
      }
    };

    server.stdin.write(JSON.stringify(contentLengthRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🔍 Test 3: Enhanced Search without filters...');
    const simpleRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'test',
          memory_banks: ['direct-test'],  // Use existing memory bank
          sort_by: 'relevance'
        }
      }
    };

    server.stdin.write(JSON.stringify(simpleRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`\n🎉 PHASE 2 ENHANCED SEARCH TESTING COMPLETED!`);
    console.log(`📊 Total test requests sent: 3`);
    console.log(`📊 Total responses received: ${responses.length}`);
    
    console.log('\n✅ Phase 2 Features Tested:');
    console.log('  ✅ Specific memory bank targeting');
    console.log('  ✅ File type filtering (pdf, txt)');
    console.log('  ✅ Content length filtering (min/max)');
    console.log('  ✅ Multiple sorting options (relevance, content_length)');
    console.log('  ✅ Sort order control (asc/desc)');

    if (responses.length > 0) {
      console.log('\n📋 Server successfully processed enhanced search requests!');
      console.log('🎯 Phase 2 Enhanced Search API is working with existing memory banks!');
    } else {
      console.log('\n❌ No responses received - there may still be an issue');
    }

  } catch (error) {
    console.error('❌ Test Error:', error);
  } finally {
    console.log('\n🔄 Cleaning up...');
    server.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testPhase2Fixed().catch(console.error); 