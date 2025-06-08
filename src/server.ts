#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import {
  CreateMemoryBankArgsSchema,
  SearchMemoryArgsSchema,
  ListMemoryBanksArgsSchema,
  ServerConfig
} from './types/index.js';
import { MemoryTools } from './tools/memory.js';
import { logger } from './lib/logger.js';

class MemvidMCPServer {
  private server: Server;
  private memoryTools!: MemoryTools;
  private config!: ServerConfig;

  constructor() {
    this.server = new Server(
      {
        name: 'memvid-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  async initialize(): Promise<void> {
    // Load configuration
    await this.loadConfig();
    
    // Initialize memory tools
    this.memoryTools = new MemoryTools(this.config);
    await this.memoryTools.initialize();

    logger.info('MemVid MCP Server initialized');
  }

  private async loadConfig(): Promise<void> {
    try {
      const configPath = process.env.MEMVID_CONFIG_PATH || 
                        path.join(process.cwd(), 'config', 'default.json');
      
      const configContent = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      
      logger.info(`Configuration loaded from ${configPath}`);
    } catch (error) {
      logger.error('Failed to load configuration:', error);
      // Use default configuration
      this.config = {
        memvid: {
          chunk_size: 512,
          overlap: 50,
          embedding_model: 'sentence-transformers/all-MiniLM-L6-v2'
        },
        storage: {
          memory_banks_dir: './memory-banks',
          max_file_size: '100MB',
          cleanup_temp_files: true
        },
        search: {
          default_top_k: 5,
          min_score_threshold: 0.3,
          max_context_tokens: 4000
        },
        performance: {
          cache_size: 100,
          parallel_processing: true,
          max_concurrent_searches: 5
        }
      };
    }
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'create_memory_bank',
            description: 'Create a new memory bank from various sources (files, directories, URLs, or text)',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Unique name for the memory bank (1-50 characters)',
                  minLength: 1,
                  maxLength: 50
                },
                description: {
                  type: 'string',
                  description: 'Optional description of the memory bank purpose'
                },
                sources: {
                  type: 'array',
                  description: 'Array of sources to include in the memory bank',
                  items: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['file', 'directory', 'url', 'text'],
                        description: 'Type of source'
                      },
                      path: {
                        type: 'string',
                        description: 'Path to the source (file path, directory path, URL, or text content)'
                      },
                      options: {
                        type: 'object',
                        properties: {
                          chunk_size: {
                            type: 'number',
                            description: 'Custom chunk size for this source'
                          },
                          overlap: {
                            type: 'number',
                            description: 'Custom overlap for this source'
                          },
                          file_types: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'File extensions to include (for directory sources)'
                          }
                        }
                      }
                    },
                    required: ['type', 'path']
                  }
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional tags for categorization'
                }
              },
              required: ['name', 'sources']
            }
          },
          {
            name: 'search_memory',
            description: 'Search across memory banks with Phase 2 enhanced filtering and sorting',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query text',
                  minLength: 1
                },
                memory_banks: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific memory banks to search (default: search all)'
                },
                top_k: {
                  type: 'number',
                  minimum: 1,
                  maximum: 50,
                  description: 'Number of top results to return (default: 5)'
                },
                min_score: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Minimum relevance score threshold (default: 0.3)'
                },
                filters: {
                  type: 'object',
                  description: 'Phase 2 enhanced filters',
                  properties: {
                    file_types: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Filter by file extensions (e.g., ["pdf", "txt"])'
                    },
                    date_range: {
                      type: 'object',
                      properties: {
                        start: {
                          type: 'string',
                          description: 'Start date (ISO format)'
                        },
                        end: {
                          type: 'string',
                          description: 'End date (ISO format)'
                        }
                      }
                    },
                    tags: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Filter by memory bank tags'
                    },
                    content_length: {
                      type: 'object',
                      properties: {
                        min: {
                          type: 'number',
                          description: 'Minimum content length'
                        },
                        max: {
                          type: 'number',
                          description: 'Maximum content length'
                        }
                      }
                    }
                  }
                },
                sort_by: {
                  type: 'string',
                  enum: ['relevance', 'date', 'file_size', 'content_length'],
                  description: 'Sort results by specified field (default: relevance)'
                },
                sort_order: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  description: 'Sort order ascending or descending (default: desc)'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'list_memory_banks',
            description: 'List all available memory banks with metadata',
            inputSchema: {
              type: 'object',
              properties: {
                include_stats: {
                  type: 'boolean',
                  description: 'Include detailed statistics for each memory bank'
                }
              }
            }
          }
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      logger.info(`Received tool call request:`, JSON.stringify(request, null, 2));
      const { name, arguments: args } = request.params;
      logger.info(`Tool name: ${name}, args:`, JSON.stringify(args, null, 2));

      try {
        switch (name) {
          case 'create_memory_bank': {
            const validatedArgs = CreateMemoryBankArgsSchema.parse(args);
            const result = await this.memoryTools.createMemoryBank(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'search_memory': {
            const validatedArgs = SearchMemoryArgsSchema.parse(args);
            const result = await this.memoryTools.searchMemory(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'list_memory_banks': {
            const validatedArgs = ListMemoryBanksArgsSchema.parse(args);
            const result = await this.memoryTools.listMemoryBanks(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        logger.error(`Error executing tool '${name}':`, error);
        
        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MemVid MCP Server running on stdio');
  }
}

// Start the server
async function main() {
  try {
    const server = new MemvidMCPServer();
    await server.initialize();
    await server.run();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
}); 