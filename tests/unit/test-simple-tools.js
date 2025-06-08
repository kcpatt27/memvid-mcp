import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testBasicTools() {
  console.log('🧪 Testing Basic MCP Tools...\n');

  let client;
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/server.js']
    });

    client = new Client(
      { name: 'test-basic-tools', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);
    console.log('✅ Connected to MemVid MCP Server');

    // Test 1: List tools
    console.log('\n📋 Testing tools/list...');
    const toolsResult = await client.request({
      method: 'tools/list',
      params: {}
    }, { timeout: 5000 });
    
    console.log('✅ Tools listed successfully');
    console.log('Available tools:', toolsResult.tools.map(t => t.name).join(', '));

    // Test 2: Basic search (no enhanced filters)
    console.log('\n🔍 Testing basic search...');
    const basicSearch = await client.request({
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'test content'
        }
      }
    }, { timeout: 10000 });

    console.log('✅ Basic search completed');
    console.log('Search result:', JSON.stringify(basicSearch, null, 2));

    console.log('\n🎉 BASIC TOOLS TEST COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
  } finally {
    if (client) {
      await client.close();
    }
    console.log('\n🔄 Cleaned up test resources');
  }
}

// Run the test
testBasicTools().catch(console.error); 