import { MemoryTools } from '../dist/tools/memory.js';
import { promises as fs } from 'fs';
import path from 'path';

async function testServerInit() {
  console.log('🚀 Testing server initialization...');
  
  try {
    console.log('📋 Loading configuration...');
    const configPath = path.join(process.cwd(), 'config', 'default.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    console.log('✅ Configuration loaded');
    
    console.log('🛠 Creating MemoryTools...');
    const memoryTools = new MemoryTools(config);
    console.log('✅ MemoryTools created');
    
    console.log('🔧 Initializing MemoryTools...');
    await memoryTools.initialize();
    console.log('✅ MemoryTools initialized');
    
    console.log('🎉 Server initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
  }
}

testServerInit(); 