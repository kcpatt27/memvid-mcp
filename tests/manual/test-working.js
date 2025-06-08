#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test configuration
const testDir = './test-data';
const testFiles = {
  'readme.md': `# Test Project\nAuthentication system using JWT tokens\nDatabase integration with PostgreSQL\n`,
  'auth.ts': `interface User {\n  id: string;\n  email: string;\n}\n\nclass AuthService {\n  async login(email: string, password: string): Promise<string> {\n    return this.generateJWT(user);\n  }\n}\n`
};

async function createTestFiles() {
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  for (const [filename, content] of Object.entries(testFiles)) {
    fs.writeFileSync(path.join(testDir, filename), content);
  }
  console.log('📁 Test files created in', testDir);
}

async function sendRequest(server, request) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 30000);

    const handleData = (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              clearTimeout(timeout);
              server.stdout.removeListener('data', handleData);
              resolve(response);
              return;
            }
          } catch (e) {
            // Ignore non-JSON lines - could be logs
          }
        }
      }
    };

    server.stdout.on('data', handleData);
    server.stdin.write(JSON.stringify(request) + '\n');
  });
}

async function testFocused() {
  console.log('🎯 Testing exact comprehensive test scenario...\n');
  
  // Create test files
  await createTestFiles();

  const server = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  server.stderr.on('data', (data) => {
    console.log('Server log:', data.toString().trim());
  });

  try {
    // Initialize
    console.log('📡 Initializing server...');
    server.stdin.write(JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" }
      }
    }) + '\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create memory bank with exact same parameters as comprehensive test
    console.log('\n📚 Creating memory bank...');
    const createResponse = await sendRequest(server, {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "create_memory_bank",
        arguments: {
          name: "test-project",
          description: "Test project for comprehensive validation",
          sources: [
            {
              type: "directory",
              path: "./test-data"
            }
          ],
          tags: ["test", "project"]
        },
        id: 2
      }
    });

    console.log('✅ Create response:', createResponse);
    
    // Check what files were created
    console.log('\n🔍 Checking created files...');
    const memoryBanksDir = './memory-banks';
    if (fs.existsSync(memoryBanksDir)) {
      const files = fs.readdirSync(memoryBanksDir);
      const projectFiles = files.filter(f => f.includes('test-project'));
      console.log('📁 Found files:', projectFiles);
      
      for (const file of projectFiles) {
        const filePath = path.join(memoryBanksDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   ${file}: ${stats.size} bytes`);
      }
    } else {
      console.log('❌ memory-banks directory does not exist');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\n🛑 Stopping server (but keeping files for inspection)...');
    server.kill();
  }
}

testFocused().catch(console.error); 