#!/usr/bin/env node

// Test script to verify all tools are registered
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

async function testTools() {
  console.log('🔍 Testing MemVid MCP Server tool registration...\n');
  
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['dist/server.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Send tools/list request
    const request = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    }) + '\n';
    
    server.stdin.write(request);
    
    // Wait for response
    setTimeout(() => {
      server.kill();
      
      try {
        // Look for JSON response in output
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('{"jsonrpc"')) {
            const response = JSON.parse(line.trim());
            if (response.result && response.result.tools) {
              console.log('✅ Server responded with tools list:');
              response.result.tools.forEach((tool, index) => {
                console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
              });
              console.log(`\n🎉 Found ${response.result.tools.length} tools total`);
              
              // Expected tools
              const expectedTools = [
                'create_memory_bank',
                'search_memory', 
                'list_memory_banks',
                'add_to_memory',
                'get_context',
                'health_check',
                'system_diagnostics'
              ];
              
              const foundTools = response.result.tools.map(t => t.name);
              const missing = expectedTools.filter(t => !foundTools.includes(t));
              const unexpected = foundTools.filter(t => !expectedTools.includes(t));
              
              if (missing.length === 0 && unexpected.length === 0) {
                console.log('✅ All expected tools found!');
              } else {
                if (missing.length > 0) {
                  console.log('❌ Missing tools:', missing);
                }
                if (unexpected.length > 0) {
                  console.log('ℹ️  Unexpected tools:', unexpected);
                }
              }
              
              resolve(true);
              return;
            }
          }
        }
        
        console.log('❌ No valid tools response found');
        console.log('Server output:', output);
        console.log('Server errors:', errorOutput);
        resolve(false);
        
      } catch (error) {
        console.log('❌ Error parsing response:', error.message);
        console.log('Raw output:', output);
        resolve(false);
      }
    }, 8000); // Wait 8 seconds for server to start and respond
    
    server.on('error', (error) => {
      console.log('❌ Server error:', error);
      reject(error);
    });
  });
}

testTools().catch(console.error); 