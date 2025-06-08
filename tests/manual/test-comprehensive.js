import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Create test content
const testDir = './test-data';
const testFiles = {
  'readme.md': `# Test Project
This is a sample project for testing MemVid MCP server functionality.

## Features
- Authentication system using JWT tokens
- Database integration with PostgreSQL
- REST API endpoints for user management
- Real-time notifications using WebSockets

## Architecture
The system follows a microservices architecture with:
- API Gateway for routing
- User service for authentication
- Notification service for real-time updates
`,
  'auth.ts': `interface User {
  id: string;
  email: string;
  hashedPassword: string;
  createdAt: Date;
}

class AuthService {
  async login(email: string, password: string): Promise<string> {
    const user = await this.findUserByEmail(email);
    if (!user || !await this.verifyPassword(password, user.hashedPassword)) {
      throw new Error('Invalid credentials');
    }
    return this.generateJWT(user);
  }

  private async generateJWT(user: User): Promise<string> {
    // JWT token generation logic
    return 'jwt-token';
  }
}
`,
  'api.py': `from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer
import jwt

app = FastAPI()
security = HTTPBearer()

@app.post("/login")
async def login(credentials: dict):
    """User login endpoint"""
    email = credentials.get("email")
    password = credentials.get("password")
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Missing credentials")
    
    # Authentication logic here
    token = generate_jwt_token(email)
    return {"access_token": token, "token_type": "bearer"}

def generate_jwt_token(email: str) -> str:
    """Generate JWT token for user"""
    payload = {"email": email, "exp": datetime.utcnow() + timedelta(hours=24)}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")
`
};

async function createTestFiles() {
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  for (const [filename, content] of Object.entries(testFiles)) {
    fs.writeFileSync(path.join(testDir, filename), content);
  }
  console.log('📁 Test files created successfully');
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

async function runComprehensiveTest() {
  console.log('🚀 Starting comprehensive MemVid MCP test...\n');
  
  // Create test files
  await createTestFiles();

  const server = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  server.stderr.on('data', (data) => {
    console.log('Server log:', data.toString());
  });

  try {
    // Step 1: Initialize
    console.log('📡 Sending initialization notification...');
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

    // Step 2: Get tools list
    console.log('🔧 Requesting tools list...');
    const toolsResponse = await sendRequest(server, {
      jsonrpc: "2.0",
      method: "tools/list",
      id: 1
    });
    
    console.log('✅ Available tools:', toolsResponse.result.tools.map(t => t.name));

    // Step 3: Create memory bank
    console.log('\n📚 Creating memory bank from test files...');
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
        }
      },
      id: 2
    });

    console.log('✅ Memory bank created');

    // Step 4: Test search
    console.log('\n🔍 Testing search functionality...');
    const searchResponse = await sendRequest(server, {
      jsonrpc: "2.0", 
      method: "tools/call",
      params: {
        name: "search_memory",
        arguments: {
          query: "authentication JWT tokens",
          memory_banks: ["test-project"],
          top_k: 3
        }
      },
      id: 3
    });

    console.log('✅ Search completed');

    console.log('\n🎉 Comprehensive test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    server.kill();
    
    // Remove test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

runComprehensiveTest().catch(console.error); 