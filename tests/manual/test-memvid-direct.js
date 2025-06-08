import { MemvidIntegration } from './dist/lib/memvid.js';
import fs from 'fs';
import path from 'path';

async function testMemvidDirect() {
  console.log('🔍 Testing MemVid integration directly...\n');
  
  // Create test files
  const testDir = './test-data-direct';
  const testFiles = {
    'readme.md': `# Direct Test Project
This is a test document for direct MemVid integration testing.

## Features
- Authentication system using JWT tokens  
- Database integration with PostgreSQL
- REST API endpoints for user management

## Architecture
The system follows a microservices architecture with separate services for authentication, data management, and API endpoints.
`,
    'auth.ts': `interface User {
  id: string;
  email: string;
  hashedPassword: string;
  role: 'admin' | 'user';
}

class AuthService {
  private users: Map<string, User> = new Map();

  async login(email: string, password: string): Promise<string> {
    const user = this.findUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    
    const isValid = await this.validatePassword(password, user.hashedPassword);
    if (!isValid) {
      throw new Error('Invalid password');
    }
    
    return this.generateJWT(user);
  }

  private async generateJWT(user: User): Promise<string> {
    // JWT generation logic here
    return 'jwt-token-' + user.id;
  }
  
  private findUserByEmail(email: string): User | undefined {
    // Implementation here
    return undefined;
  }
  
  private async validatePassword(plain: string, hashed: string): Promise<boolean> {
    // Password validation logic
    return plain === hashed; // Simplified
  }
}

export { AuthService, User };
`
  };

  // Create test files
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  for (const [filename, content] of Object.entries(testFiles)) {
    fs.writeFileSync(path.join(testDir, filename), content);
  }
  console.log('📁 Test files created in', testDir);

  // Create MemVid integration instance
  const memvid = new MemvidIntegration({
    chunk_size: 512,
    overlap: 50,
    embedding_model: "sentence-transformers/all-MiniLM-L6-v2"
  });

  // Test memory bank creation
  const outputPath = path.resolve('./memory-banks/direct-test.mp4');
  console.log('📚 Creating memory bank at:', outputPath);
  
  const result = await memvid.createMemoryBank(
    'direct-test',
    [
      {
        type: 'directory',
        path: testDir,
        options: {
          file_types: ['.md', '.ts', '.js', '.txt']
        }
      }
    ],
    outputPath
  );

  console.log('\n✅ Memory bank creation result:', result);

  // Check if files were created
  console.log('\n📋 Checking created files:');
  
  const bankExists = fs.existsSync(outputPath);
  const indexPath = outputPath.replace('.mp4', '.faiss');
  const indexExists = fs.existsSync(indexPath);
  
  console.log(`  MP4 file: ${bankExists ? '✅' : '❌'} ${outputPath}`);
  if (bankExists) {
    const stats = fs.statSync(outputPath);
    console.log(`    Size: ${stats.size} bytes`);
  }
  
  console.log(`  Index file: ${indexExists ? '✅' : '❌'} ${indexPath}`);
  if (indexExists) {
    const stats = fs.statSync(indexPath);
    console.log(`    Size: ${stats.size} bytes`);
  }

  // Test search if bank was created
  if (bankExists && indexExists) {
    console.log('\n🔍 Testing search functionality...');
    const searchResults = await memvid.searchMemoryBank(
      outputPath,
      'authentication JWT tokens',
      3,
      0.1
    );
    
    console.log(`  Found ${searchResults.length} results:`);
    searchResults.forEach((result, i) => {
      console.log(`    ${i + 1}. Score: ${result.score.toFixed(3)} - ${result.content.substring(0, 100)}...`);
    });
  }

  console.log('\n🎉 Direct test complete!');
}

testMemvidDirect().catch(console.error); 