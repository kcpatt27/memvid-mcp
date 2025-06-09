import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testToolsCount() {
  const serverPath = './dist/server.js';
  const serverProcess = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'inherit'] });

  const transport = new StdioClientTransport();
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

  try {
    await client.connect(transport);
    await transport.connect(serverProcess.stdout, serverProcess.stdin);
    
    console.log('✅ Connected to server');
    
    const toolsResult = await client.listTools();
    console.log(`📊 Tools available: ${toolsResult.tools.length}`);
    
    for (const tool of toolsResult.tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
    }
    
    client.close();
    serverProcess.kill();
    
    if (toolsResult.tools.length === 0) {
      console.log('❌ No tools registered - this explains the "0 tools enabled" issue');
    } else {
      console.log(`✅ ${toolsResult.tools.length} tools properly registered`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    serverProcess.kill();
  }
}

testToolsCount().catch(console.error); 