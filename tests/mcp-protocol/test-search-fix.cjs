const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');

async function testSearchFix() {
  console.log('=== Testing Search Fix ===');
  
  try {
    // Spawn the MCP server with environment variables like Cursor does
    const serverProcess = spawn('node', ['dist/server.js'], {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: {
        ...process.env,
        MEMORY_BANKS_DIR: 'D:\\projects\\personal-projects\\memvid-mcp\\memory-banks',
        PYTHON_EXECUTABLE: 'D:\\projects\\personal-projects\\memvid-mcp\\memvid-env\\Scripts\\python.exe',
        PYTHONIOENCODING: 'utf-8',
        PYTHONLEGACYWINDOWSSTDIO: 'utf-8',
        DEBUG: 'false'
      }
    });

    const transport = new StdioClientTransport({
      readable: serverProcess.stdout,
      writable: serverProcess.stdin
    });

    const client = new Client(
      {
        name: 'test-search-client',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );

    await client.connect(transport);
    console.log('✅ Connected to MCP server');

    // Test list_memory_banks first
    console.log('\n--- Testing list_memory_banks ---');
    const listResult = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'list_memory_banks',
          arguments: { include_stats: true }
        }
      },
      {
        timeout: 10000
      }
    );
    
    console.log('List result:', JSON.stringify(listResult, null, 2));

    // Test search_memory 
    console.log('\n--- Testing search_memory ---');
    const searchResult = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: 'authentication',
            top_k: 3
          }
        }
      },
      {
        timeout: 30000
      }
    );

    console.log('Search result:', JSON.stringify(searchResult, null, 2));

    if (searchResult.content && searchResult.content[0] && searchResult.content[0].type === 'text') {
      const resultData = JSON.parse(searchResult.content[0].text);
      console.log(`\n=== Search Results Summary ===`);
      console.log(`Results found: ${resultData.results ? resultData.results.length : 0}`);
      console.log(`Banks searched: [${resultData.banks_searched ? resultData.banks_searched.join(', ') : 'none'}]`);
      
      if (resultData.banks_searched && resultData.banks_searched.length > 0) {
        console.log('🎉 SUCCESS: Search is now working! Banks were searched.');
      } else {
        console.log('❌ STILL BROKEN: No banks were searched.');
      }
    }

    await client.close();
    serverProcess.kill();
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSearchFix(); 