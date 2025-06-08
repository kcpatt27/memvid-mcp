#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Starting simple MCP test...');

const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

server.stderr.on('data', (data) => {
  console.log('Server log:', data.toString().trim());
});

let requestId = 1;
let initialized = false;

server.stdout.on('data', (data) => {
  const response = JSON.parse(data.toString().trim());
  console.log('📥 Response:', response);
  
  if (response.id === 1 && !initialized) {
    // Initialize response received, send initialized notification
    console.log('📤 Sending initialized notification...');
    const notification = {
      jsonrpc: "2.0",
      method: "notifications/initialized"
    };
    server.stdin.write(JSON.stringify(notification) + '\\n');
    initialized = true;
    
    // Now send tools/list request
    setTimeout(() => {
      console.log('📤 Sending tools/list request...');
      const toolsRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list"
      };
      server.stdin.write(JSON.stringify(toolsRequest) + '\\n');
    }, 500);
    
  } else if (response.id === 2) {
    // Tools list response
    console.log('✅ Got tools list, terminating');
    server.kill();
  }
});

// Give server time to start
setTimeout(() => {
  console.log('📤 Sending initialize request...');
  
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };
  
  server.stdin.write(JSON.stringify(initRequest) + '\\n');
  
  // Timeout after 10 seconds
  setTimeout(() => {
    console.log('❌ Timeout - killing server');
    server.kill();
  }, 10000);
  
}, 2000); 