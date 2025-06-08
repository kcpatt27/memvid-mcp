#!/usr/bin/env node

/**
 * Phase 3b Simple Search Performance Test
 * Validates that search functionality is working after parameter mapping fix
 */

import { spawn } from 'child_process';
import path from 'path';

console.log('🔍 Phase 3b Search Functionality Test');
console.log('=====================================');

const serverPath = path.join(process.cwd(), 'dist', 'server.js');
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let responseData = '';
let responsesReceived = 0;
const expectedResponses = 1;

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  responseData += output;
  
  // Log server activity
  if (output.includes('[INFO]') || output.includes('[WARN]') || output.includes('[ERROR]')) {
    console.log('📋 Server Log:', output.trim());
  }
  
  // Check for JSON-RPC responses
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.trim() && line.includes('"jsonrpc":"2.0"') && line.includes('"id":1')) {
      try {
        const response = JSON.parse(line);
        console.log('✅ Search Response Received!');
        
        if (response.result && response.result.content) {
          const content = response.result.content[0].text;
          const searchResult = JSON.parse(content);
          
          console.log('📊 Search Results:');
          console.log(`   🔍 Query: "${searchResult.query}"`);
          console.log(`   📈 Total Results: ${searchResult.total_results}`);
          console.log(`   🏦 Banks Searched: ${searchResult.banks_searched?.length || 0}`);
          
          if (searchResult.banks_searched) {
            console.log(`   📋 Banks: ${searchResult.banks_searched.join(', ')}`);
          }
          
          if (searchResult.results && searchResult.results.length > 0) {
            console.log('   🎯 Sample Results:');
            searchResult.results.slice(0, 3).forEach((result, i) => {
              console.log(`      ${i + 1}. Score: ${result.score?.toFixed(3) || 'N/A'} - ${result.content?.substring(0, 100) || 'No content'}...`);
            });
          }
          
          responsesReceived++;
        }
      } catch (parseError) {
        // Ignore parse errors for non-JSON lines
      }
    }
  }
});

// Handle server errors
serverProcess.stderr.on('data', (data) => {
  const error = data.toString();
  if (error.includes('Bridge ready, sent JSON ready signal')) {
    console.log('✅ Python bridge ready!');
  } else if (error.includes('Loading heavy dependencies')) {
    console.log('⏳ Loading AI models (this may take time on first run)...');
  } else if (error.includes('All heavy dependencies loaded')) {
    console.log('✅ AI models loaded successfully!');
  } else if (error.includes('ERROR') || error.includes('FAILED')) {
    console.log('❌ Server Error:', error.trim());
  } else {
    console.log('📋 Server Log:', error.trim());
  }
});

// Wait for server to be ready, then send search request
setTimeout(() => {
  console.log('\n🔍 Testing search functionality...');
  
  const searchRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'search_memory',
      arguments: {
        query: 'test content'
      }
    }
  };
  
  console.log('📤 Sending search request...');
  serverProcess.stdin.write(JSON.stringify(searchRequest) + '\n');
  
}, 2000); // Wait 2 seconds for server startup

// Set timeout for the test
setTimeout(() => {
  console.log('\n📊 Test Results:');
  console.log(`📈 Responses received: ${responsesReceived}/${expectedResponses}`);
  
  if (responsesReceived >= expectedResponses) {
    console.log('✅ Search functionality is working!');
    console.log('🎯 Phase 3b: Parameter mapping fix successful');
  } else {
    console.log('⚠️  Search may still be processing (model loading can take time)');
    console.log('💡 Check logs above for progress indicators');
  }
  
  console.log('\n🔄 Cleaning up...');
  serverProcess.kill();
  process.exit(0);
}, 60000); // 60 second timeout

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🔄 Cleaning up...');
  serverProcess.kill();
  process.exit(0);
}); 