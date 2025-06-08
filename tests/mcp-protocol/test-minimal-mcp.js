#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

console.error('[DEBUG] Starting minimal MCP server test...');

const server = new Server(
  {
    name: 'minimal-test',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

console.error('[DEBUG] Server created');

// Simple tools list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('[DEBUG] tools/list handler called');
  return {
    tools: [
      {
        name: 'test_tool',
        description: 'A simple test tool',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

console.error('[DEBUG] Handler registered');

async function main() {
  try {
    console.error('[DEBUG] Creating transport...');
    const transport = new StdioServerTransport();
    
    console.error('[DEBUG] Connecting server...');
    await server.connect(transport);
    
    console.error('[DEBUG] Server connected and running');
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[ERROR] Unhandled error:', error);
  process.exit(1);
}); 