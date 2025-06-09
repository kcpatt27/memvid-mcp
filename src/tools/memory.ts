import {
  CreateMemoryBankArgs,
  CreateMemoryBankResponse,
  SearchMemoryArgs,
  SearchMemoryResponse,
  SearchResult,
  SearchFilters,
  AddToMemoryArgs,
  AddToMemoryResponse,
  GetContextArgs,
  GetContextResponse,
  ListMemoryBanksArgs,
  ListMemoryBanksResponse,
  MemoryBankNotFoundError,
  InvalidSourceError,
  ServerConfig
} from '../types/index.js';
import { DirectMemvidIntegration } from '../lib/memvid.js';
import { StorageManager } from '../lib/storage.js';
import { logger } from '../lib/logger.js';
import { getSearchCache } from '../lib/search-cache.js';
import { memoryBankValidator, MemoryBankValidator } from '../lib/memory-bank-validator.js';

export class MemoryTools {
  private memvid: DirectMemvidIntegration;
  private storage: StorageManager;
  private validator: MemoryBankValidator;

  constructor(private config: ServerConfig) {
    this.memvid = new DirectMemvidIntegration(config.memvid);
    this.storage = new StorageManager(config);
    // Create validator with correct memory banks directory
    this.validator = new MemoryBankValidator(config.storage.memory_banks_dir as string);
  }

  /**
   * Initialize the memory tools
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    await this.memvid.initialize(); // Initialize the direct Python bridge
    
    // Only start health monitoring in non-MCP mode to avoid polluting stdio 
    const isMcpMode = !process.stdin.isTTY || process.argv.includes('--mcp');
    if (!isMcpMode) {
      this.memvid.startHealthMonitoring();
      logger.info('Memory tools initialized with direct MemVid integration and health monitoring');
    } else {
      logger.info('Memory tools initialized with direct MemVid integration (health monitoring disabled for MCP mode)');
    }
  }

  /**
   * Create a new memory bank from sources
   */
  async createMemoryBank(args: CreateMemoryBankArgs): Promise<CreateMemoryBankResponse> {
    try {
      logger.info(`Creating memory bank '${args.name}'`);

      // Validate sources
      for (const source of args.sources) {
        if (!source.path || source.path.trim() === '') {
          throw new InvalidSourceError(source.path, 'Path cannot be empty');
        }
      }

      // 🛡️ Production Reliability: Validate bank doesn't exist
      const isReady = await this.validator.isMemoryBankReady(args.name, 'create');
      if (!isReady) {
        return {
          success: false,
          message: `Memory bank '${args.name}' already exists`,
          bank_name: args.name
        };
      }

      // Double-check with storage manager
      const existingBank = await this.storage.getMemoryBank(args.name);
      if (existingBank) {
        return {
          success: false,
          message: `Memory bank '${args.name}' already exists in registry`,
          bank_name: args.name
        };
      }

      // Get output path
      const outputPath = this.storage.getMemoryBankPath(args.name);

      // Create memory bank using MemVid
      logger.info(`Starting MemVid creation for '${args.name}' with sources: ${JSON.stringify(args.sources)}`);
      const result = await this.memvid.createMemoryBank(args.name, args.sources, outputPath);
      logger.info(`MemVid creation completed for '${args.name}':`, result);

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to create memory bank',
          bank_name: args.name
        };
      }

      // Register in storage manager
      await this.storage.registerMemoryBank(
        args.name,
        args.description || `Memory bank created from ${args.sources.length} sources`,
        outputPath,
        args.tags || [],
        result.chunksCreated
      );

      logger.info(`Successfully created memory bank '${args.name}' with ${result.chunksCreated} chunks`);

      return {
        success: true,
        message: `Memory bank '${args.name}' created successfully`,
        bank_name: args.name,
        file_path: outputPath,
        chunks_created: result.chunksCreated
      };

    } catch (error) {
      logger.error(`Error creating memory bank '${args.name}':`, error);
      
      if (error instanceof InvalidSourceError) {
        return {
          success: false,
          message: error.message,
          bank_name: args.name
        };
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        bank_name: args.name
      };
    }
  }

  /**
   * Search across memory banks with Phase 2 enhanced filtering and Phase 3c caching
   */
  async searchMemory(args: SearchMemoryArgs): Promise<SearchMemoryResponse> {
    const searchStart = Date.now();
    
    try {
      logger.info(`Enhanced search for: '${args.query}' with filters:`, args.filters);

      const cache = getSearchCache();
      const cacheKey = {
        query: args.query,
        memory_banks: args.memory_banks,
        filters: args.filters,
        sort_by: args.sort_by,
        sort_order: args.sort_order,
        top_k: args.top_k,
        min_score: args.min_score
      } as any;

      const cachedResults = await cache.getCachedResults(cacheKey);
      if (cachedResults && cachedResults.results) {
        const searchTime = Date.now() - searchStart;
        logger.info(`Cache HIT: Search completed in ${searchTime}ms (${cachedResults.results.length} results)`);
        
        return {
          results: cachedResults.results,
          total_results: cachedResults.total_results,
          query: args.query,
          banks_searched: cachedResults.banks_searched
        };
      }

      let banksToSearch: string[] = [];
      if (args.memory_banks && args.memory_banks.length > 0) {
        banksToSearch = args.memory_banks;
      } else {
        const allBanks = await this.storage.listMemoryBanks();
        banksToSearch = allBanks
          .filter(bank => {
            if (args.filters?.tags && args.filters.tags.length > 0) {
              return args.filters.tags.some(tag => bank.tags.includes(tag));
            }
            return true;
          })
          .map(bank => bank.name);
      }

      if (banksToSearch.length === 0) {
        return {
          results: [],
          total_results: 0,
          query: args.query,
          banks_searched: []
        };
      }

      const allResults = [];
      const actualBanksSearched = [];

      for (const bankName of banksToSearch) {
        const isReady = await this.validator.isMemoryBankReady(bankName, 'search');
        if (!isReady) {
          logger.warn(`🚨 Memory bank '${bankName}' is not ready for search operations, skipping`);
          continue;
        }

        const bankMetadata = await this.storage.getMemoryBank(bankName);
        if (!bankMetadata) {
          logger.warn(`Memory bank '${bankName}' not found in registry, skipping`);
          continue;
        }

        const bankResults = await this.memvid.searchMemoryBank(
          bankMetadata.file_path,
          args.query,
          args.top_k || this.config.search.default_top_k,
          args.min_score || this.config.search.min_score_threshold
        );

        const filteredResults = this.applySearchFilters(bankResults, args.filters as SearchFilters);
        allResults.push(...filteredResults);
        actualBanksSearched.push(bankName);
      }

      const sortedResults = this.applySorting(allResults, args.sort_by, args.sort_order);

      const topK = args.top_k || this.config.search.default_top_k;
      const finalResults = sortedResults.slice(0, topK);

      const searchTime = Date.now() - searchStart;
      logger.info(`Enhanced search found ${finalResults.length} results across ${actualBanksSearched.length} banks in ${searchTime}ms`);

      await cache.cacheResults(cacheKey, finalResults, finalResults.length, actualBanksSearched);

      return {
        results: finalResults,
        total_results: finalResults.length,
        query: args.query,
        banks_searched: actualBanksSearched
      };

    } catch (error) {
      const searchTime = Date.now() - searchStart;
      logger.error(`Error in enhanced search after ${searchTime}ms:`, error);
      return {
        results: [],
        total_results: 0,
        query: args.query,
        banks_searched: []
      };
    }
  }

  /**
   * Apply Phase 2 search filters to results
   */
  private applySearchFilters(results: SearchResult[], filters?: SearchFilters): SearchResult[] {
    if (!filters) return results;

    return results.filter(result => {
      // Filter by file types
      if (filters.file_types && filters.file_types.length > 0) {
        const sourceExt = result.metadata.source?.split('.').pop()?.toLowerCase();
        if (!sourceExt || !filters.file_types.includes(sourceExt)) {
          return false;
        }
      }

      // Filter by date range
      if (filters.date_range && result.metadata.timestamp) {
        const resultDate = new Date(result.metadata.timestamp);
        if (filters.date_range.start && resultDate < new Date(filters.date_range.start)) {
          return false;
        }
        if (filters.date_range.end && resultDate > new Date(filters.date_range.end)) {
          return false;
        }
      }

      // Filter by content length
      if (filters.content_length) {
        const contentLength = result.content.length;
        if (filters.content_length.min && contentLength < filters.content_length.min) {
          return false;
        }
        if (filters.content_length.max && contentLength > filters.content_length.max) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply Phase 2 sorting to search results
   */
  private applySorting(
    results: SearchResult[], 
    sortBy?: 'relevance' | 'date' | 'file_size' | 'content_length',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): SearchResult[] {
    if (!sortBy || sortBy === 'relevance') {
      // Default: sort by relevance (score)
      return results.sort((a, b) => 
        sortOrder === 'desc' ? b.score - a.score : a.score - b.score
      );
    }

    return results.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case 'date':
          aValue = a.metadata.timestamp ? new Date(a.metadata.timestamp).getTime() : 0;
          bValue = b.metadata.timestamp ? new Date(b.metadata.timestamp).getTime() : 0;
          break;
        case 'content_length':
          aValue = a.content.length;
          bValue = b.content.length;
          break;
        case 'file_size':
          // This would need additional metadata in the future
          aValue = a.content.length; // Proxy for now
          bValue = b.content.length;
          break;
        default:
          return 0;
      }

      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  }

  /**
   * Add content to an existing memory bank
   */
  async addToMemory(args: AddToMemoryArgs): Promise<AddToMemoryResponse> {
    try {
      logger.info(`Adding content to memory bank '${args.memory_bank}'`);

      // Check if memory bank exists
      const bankMetadata = await this.storage.getMemoryBank(args.memory_bank);
      if (!bankMetadata) {
        throw new MemoryBankNotFoundError(args.memory_bank);
      }

      // Add content using MemVid
      const result = await this.memvid.addToMemoryBank(
        bankMetadata.file_path,
        args.content,
        args.metadata
      );

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to add content to memory bank',
          chunks_added: 0
        };
      }

      // Update metadata
      await this.storage.updateMemoryBank(args.memory_bank, {
        size: bankMetadata.size + result.chunksAdded,
        last_updated: new Date().toISOString()
      });

      logger.info(`Successfully added content to '${args.memory_bank}' (${result.chunksAdded} chunks)`);

      return {
        success: true,
        message: `Content added to memory bank '${args.memory_bank}'`,
        chunks_added: result.chunksAdded
      };

    } catch (error) {
      logger.error(`Error adding to memory bank '${args.memory_bank}':`, error);
      
      if (error instanceof MemoryBankNotFoundError) {
        return {
          success: false,
          message: error.message,
          chunks_added: 0
        };
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        chunks_added: 0
      };
    }
  }

  /**
   * Get context from memory banks for a query
   */
  async getContext(args: GetContextArgs): Promise<GetContextResponse> {
    try {
      logger.info(`Getting context for query: "${args.query}"`);
      logger.debug(`Context args:`, { 
        query: args.query, 
        memory_banks: args.memory_banks,
        max_tokens: args.max_tokens,
        include_metadata: args.include_metadata
      });

      // Search for relevant content using the working search functionality
      const searchArgs: SearchMemoryArgs = {
        query: args.query,
        memory_banks: args.memory_banks,
        top_k: Math.min(args.max_tokens ? Math.floor(args.max_tokens / 200) : 10, 20), // Estimate chunks needed
        min_score: this.config.search.min_score_threshold
      };

      logger.debug(`Calling searchMemory with args:`, searchArgs);
      const searchResponse = await this.searchMemory(searchArgs);
      logger.debug(`Search response:`, { 
        resultsCount: searchResponse.results.length,
        banksSearched: searchResponse.banks_searched
      });

      if (searchResponse.results.length === 0) {
        logger.info('No search results found for context query');
        return {
          context: 'No relevant context found for the query.',
          sources: [],
          total_tokens: 0
        };
      }

      // Build context string and sources array
      let context = '';
      let tokenCount = 0;
      const maxTokens = args.max_tokens || this.config.search.max_context_tokens;
      const sources: Array<{
        bank_name: string;
        content_preview: string;
        score: number;
      }> = [];

      logger.debug(`Building context with max tokens: ${maxTokens}`);

      for (let i = 0; i < searchResponse.results.length; i++) {
        const result = searchResponse.results[i];
        if (!result) {
          logger.warn(`Skipping result ${i + 1}: result is undefined`);
          continue;
        }
        
        // Validate result properties first before trying to access them
        if (!result.content || typeof result.content !== 'string') {
          logger.warn(`Skipping result ${i + 1}: invalid content`, result);
          continue;
        }
        if (!result.bank_name || typeof result.bank_name !== 'string') {
          logger.warn(`Skipping result ${i + 1}: invalid bank_name`, result);
          continue;
        }

        // Now that we've validated the properties, we can safely log them
        logger.debug(`Processing result ${i + 1}/${searchResponse.results.length}:`, {
          bank_name: result.bank_name,
          content_length: result.content.length,
          score: result.score
        });

        // Estimate tokens for this content (rough approximation: 1 token ≈ 4 characters)
        const contentTokens = Math.ceil(result.content.length / 4);
        logger.debug(`Content tokens estimated: ${contentTokens}, current total: ${tokenCount}`);
        
        // Check if adding this content would exceed token limit
        if (tokenCount + contentTokens > maxTokens) {
          logger.debug(`Token limit would be exceeded, stopping at ${i + 1} results`);
          break;
        }

        // Add separator between context sections (but not before the first one)
        if (context.length > 0) {
          context += '\n\n---\n\n';
        }

        // Add metadata header if requested
        if (args.include_metadata && result.metadata && Object.keys(result.metadata).length > 0) {
          context += `[Source: ${result.bank_name}`;
          if (result.metadata.source) {
            context += ` - ${result.metadata.source}`;
          }
          context += ']\n';
        }

        // Add the actual content
        context += result.content;
        tokenCount += contentTokens;

        // Add to sources array
        try {
          sources.push({
            bank_name: result.bank_name,
            content_preview: result.content.substring(0, 100) + (result.content.length > 100 ? '...' : ''),
            score: result.score || 0
          });
        } catch (sourceError) {
          logger.warn(`Error adding source ${i + 1}:`, sourceError);
        }
      }

      logger.info(`Successfully generated context: ${tokenCount} tokens from ${sources.length} sources`);
      logger.debug(`Context preview:`, context.substring(0, 200) + '...');

      return {
        context: context.trim(),
        sources,
        total_tokens: tokenCount
      };

    } catch (error) {
      logger.error('Error in getContext method:', error);
      logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return {
        context: 'Error retrieving context.',
        sources: [],
        total_tokens: 0
      };
    }
  }

  /**
   * List all memory banks with production reliability validation
   */
  async listMemoryBanks(args: ListMemoryBanksArgs): Promise<ListMemoryBanksResponse> {
    try {
      logger.info('Listing memory banks from registry');

      // Get all banks directly from the storage registry
      const banks = await this.storage.listMemoryBanks();

      // Optionally include detailed stats from the registry, avoiding live validation
      if (args.include_stats) {
        for (const bank of banks) {
          // The size in the registry should represent chunks, which is a key stat.
          // No need for a live check which is expensive.
          (bank as any).stats = {
            chunks: bank.size,
          };
        }
      }

      logger.info(`Found ${banks.length} memory banks in registry`);

      return {
        banks,
        total_count: banks.length
      };

    } catch (error) {
      logger.error(`Error listing memory banks:`, error);
      return {
        banks: [],
        total_count: 0
      };
    }
  }

  /**
   * Clean up temporary files and Python bridge process
   */
  async cleanup(): Promise<void> {
    await this.storage.cleanupTempFiles();
    await this.memvid.cleanup(); // Clean up the Python bridge process
    logger.info('Memory tools cleanup completed');
  }
}
