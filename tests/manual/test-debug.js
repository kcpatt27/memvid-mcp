import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Create test content
const testDir = './test-data-debug';
const testFiles = {
  'readme.md': `# Test Project
This is a sample project for testing MemVid MCP server functionality.

## Features
- Authentication system using JWT tokens
- Database integration with PostgreSQL
- REST API endpoints for user management

## Architecture
The system follows a microservices architecture.
`,
  'auth.ts': `interface User {
  id: string;
  email: string;
  hashedPassword: string;
}

class AuthService {
  async login(email: string, password: string): Promise<string> {
    // Authentication logic
    return this.generateJWT(user);
  }

  private async generateJWT(user: User): Promise<string> {
    return 'jwt-token';
  }
}
`
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
            // Ignore non-JSON lines
          }
        }
      }
    };

    server.stdout.on('data', handleData);
    server.stdin.write(JSON.stringify(request) + '\n');
  });
}

async function runDebugTest() {
  console.log('🔍 Starting debug test (no cleanup)...\n');
  
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
    console.log('📡 Initializing...');
    server.stdin.write(JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "debug-client", version: "1.0.0" }
      }
    }) + '\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create memory bank
    console.log('\n📚 Creating memory bank...');
    const bankName = `debug-bank-${Date.now()}`;
    const createResponse = await sendRequest(server, {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "create_memory_bank",
        arguments: {
          name: bankName,
          description: "Debug test bank",
          sources: [
            {
              type: "directory",
              path: testDir
            }
          ]
        }
      },
      id: 1
    });

    console.log('✅ Memory bank created, response:', JSON.stringify(createResponse.result, null, 2));

    // Wait a bit and check what files exist
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📋 Files created:');
    if (fs.existsSync('./memory-banks')) {
      const files = fs.readdirSync('./memory-banks');
      files.forEach(file => {
        const filePath = path.join('./memory-banks', file);
        const stats = fs.statSync(filePath);
        console.log(`  ${file} (${stats.size} bytes)`);
      });
    } else {
      console.log('  No memory-banks directory found');
    }

    console.log('\n🎉 Debug test complete - files preserved for inspection');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    server.kill();
  }
}

runDebugTest().catch(console.error); 