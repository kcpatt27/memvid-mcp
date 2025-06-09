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
  AddToMemoryArgsSchema,
  GetContextArgsSchema,
  ServerConfig
} from './types/index.js';
import { MemoryTools } from './tools/memory.js';
import { HealthTools } from './tools/health.js';
import { logger } from './lib/logger.js';
import { CLI } from './lib/cli.js';
import { AutoSetup } from './lib/auto-setup.js';

class MemvidMCPServer {
  private server: Server;
  private memoryTools!: MemoryTools;
  private healthTools!: HealthTools;
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
    // Check system setup first
    const setupStatus = await AutoSetup.detectSetup();
    
    if (!setupStatus.isReady) {
      // Log setup issues but continue - MCP should still respond
      logger.warn('Setup issues detected:');
      for (const issue of setupStatus.issues.filter(i => i.severity === 'error')) {
        logger.error(`${issue.component}: ${issue.message}`);
      }
      logger.info('Server will start but some features may not work. Run --setup for details.');
    }
    
    // Load configuration
    await this.loadConfig();
    
    // Initialize memory tools with enhanced error handling
    try {
      this.memoryTools = new MemoryTools(this.config);
      await this.memoryTools.initialize();
      
      // Initialize health tools
      this.healthTools = new HealthTools((this.memoryTools as any).memvid);
      
      logger.info('MemVid MCP Server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize memory tools:', error);
      logger.info('Server will continue with limited functionality');
      
      // Create a minimal memory tools instance for error responses
      this.memoryTools = new MemoryTools(this.config);
      // Create minimal health tools as well
      try {
        this.healthTools = new HealthTools((this.memoryTools as any).memvid);
      } catch (healthError) {
        logger.warn('Failed to initialize health tools:', healthError);
      }
    }
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
          },
          {
            name: 'add_to_memory',
            description: 'Add content to an existing memory bank',
            inputSchema: {
              type: 'object',
              properties: {
                memory_bank: {
                  type: 'string',
                  description: 'Name of the memory bank to add content to'
                },
                content: {
                  type: 'string',
                  description: 'Content to add to the memory bank'
                },
                metadata: {
                  type: 'object',
                  description: 'Optional metadata for the content'
                }
              },
              required: ['memory_bank', 'content']
            }
          },
          {
            name: 'get_context',
            description: 'Get context from memory banks for a query',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Query to get context for'
                },
                memory_banks: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific memory banks to search (default: search all)'
                },
                max_tokens: {
                  type: 'number',
                  description: 'Maximum number of tokens in the response'
                },
                include_metadata: {
                  type: 'boolean',
                  description: 'Include source metadata in the context'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'health_check',
            description: 'Perform a health check of the system',
            inputSchema: {
              type: 'object',
              properties: {
                detailed: {
                  type: 'boolean',
                  description: 'Include detailed metrics in the health check'
                }
              }
            }
          },
          {
            name: 'system_diagnostics',
            description: 'Get comprehensive system diagnostics',
            inputSchema: {
              type: 'object',
              properties: {
                includeMetrics: {
                  type: 'boolean',
                  description: 'Include system metrics in diagnostics'
                },
                includeLogs: {
                  type: 'boolean',
                  description: 'Include recent logs in diagnostics'
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

          case 'add_to_memory': {
            const validatedArgs = AddToMemoryArgsSchema.parse(args);
            const result = await this.memoryTools.addToMemory(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'get_context': {
            const validatedArgs = GetContextArgsSchema.parse(args);
            const result = await this.memoryTools.getContext(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'health_check': {
            if (!this.healthTools) {
              throw new McpError(
                ErrorCode.InternalError,
                'Health tools not available'
              );
            }
            const result = await this.healthTools.healthCheck(args);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'system_diagnostics': {
            if (!this.healthTools) {
              throw new McpError(
                ErrorCode.InternalError,
                'Health tools not available'
              );
            }
            const result = await this.healthTools.getDiagnostics(args);
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
    // Handle CLI commands first
    const isCliCommand = await CLI.handleArgs(process.argv);
    if (isCliCommand) {
      // CLI command was executed, exit gracefully
      process.exit(0);
    }

    // Only show startup banner if we're not in MCP mode (when connected via stdio)
    // In MCP mode, stdout should only contain JSON-RPC messages
    const isMcpMode = process.stdin.isTTY === false || process.argv.includes('--mcp');
    if (!isMcpMode) {
      await CLI.showStartupBanner();
    }

    // Start MCP server
    const server = new MemvidMCPServer();
    await server.initialize();
    await server.run();
  } catch (error) {
    logger.error('Failed to start server:', error);
    
    // Provide helpful error message
    console.error('\n❌ MemVid MCP Server failed to start');
    console.error('🔧 Run the following for diagnostics:');
    console.error('  npx @kcpatt27/memvid-mcp-server --setup');
    console.error('  npx @kcpatt27/memvid-mcp-server --install\n');
    
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Unhandled error:', error);
  console.error('\n💥 Unexpected error occurred');
  console.error('🐛 Please report this issue: https://github.com/kcpatt27/memvid-mcp-server/issues');
  console.error(`Error: ${error.message}`);
  process.exit(1);
}); 