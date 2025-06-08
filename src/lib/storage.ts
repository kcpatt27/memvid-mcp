import { promises as fs } from 'fs';
import path from 'path';
import { MemoryBankMetadata, ServerConfig } from '../types/index.js';
import { logger } from './logger.js';

export class StorageManager {
  private registryPath: string;
  private memoryBanksDir: string;

  constructor(private config: ServerConfig) {
    this.registryPath = path.join(process.cwd(), 'config', 'memory-banks.json');
    this.memoryBanksDir = path.resolve(config.storage.memory_banks_dir);
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    try {
      // Create memory banks directory
      await fs.mkdir(this.memoryBanksDir, { recursive: true });
      
      // Create logs directory for later winston integration
      await fs.mkdir(path.join(process.cwd(), 'logs'), { recursive: true });
      
      // Create temp directory
      await fs.mkdir(path.join(process.cwd(), 'temp'), { recursive: true });
      
      logger.info('Storage directories initialized');
    } catch (error) {
      logger.error('Failed to initialize storage directories:', error);
      throw error;
    }
  }

  /**
   * Load memory banks registry
   */
  async loadRegistry(): Promise<{ banks: Record<string, MemoryBankMetadata>; last_updated: string | null; version: string }> {
    try {
      const registryContent = await fs.readFile(this.registryPath, 'utf-8');
      return JSON.parse(registryContent);
    } catch (error) {
      logger.warn('Registry file not found, creating new one');
      const emptyRegistry = {
        banks: {},
        last_updated: null,
        version: '1.0.0'
      };
      await this.saveRegistry(emptyRegistry);
      return emptyRegistry;
    }
  }

  /**
   * Save memory banks registry
   */
  async saveRegistry(registry: { banks: Record<string, MemoryBankMetadata>; last_updated: string | null; version: string }): Promise<void> {
    try {
      registry.last_updated = new Date().toISOString();
      await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2));
      logger.debug('Registry saved successfully');
    } catch (error) {
      logger.error('Failed to save registry:', error);
      throw error;
    }
  }

  /**
   * Register a new memory bank
   */
  async registerMemoryBank(
    name: string,
    description: string,
    filePath: string,
    tags: string[] = [],
    size: number = 0
  ): Promise<void> {
    const registry = await this.loadRegistry();
    
    const metadata: MemoryBankMetadata = {
      name,
      description,
      size,
      created: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      tags,
      file_path: filePath
    };

    registry.banks[name] = metadata;
    await this.saveRegistry(registry);
    
    logger.info(`Registered memory bank '${name}' at '${filePath}'`);
  }

  /**
   * Get memory bank metadata
   */
  async getMemoryBank(name: string): Promise<MemoryBankMetadata | null> {
    const registry = await this.loadRegistry();
    return registry.banks[name] || null;
  }

  /**
   * List all memory banks
   */
  async listMemoryBanks(): Promise<MemoryBankMetadata[]> {
    const registry = await this.loadRegistry();
    return Object.values(registry.banks);
  }

  /**
   * Update memory bank metadata
   */
  async updateMemoryBank(name: string, updates: Partial<MemoryBankMetadata>): Promise<void> {
    const registry = await this.loadRegistry();
    
    if (!registry.banks[name]) {
      throw new Error(`Memory bank '${name}' not found`);
    }

    registry.banks[name] = {
      ...registry.banks[name],
      ...updates,
      last_updated: new Date().toISOString()
    };

    await this.saveRegistry(registry);
    logger.info(`Updated memory bank '${name}'`);
  }

  /**
   * Remove memory bank from registry and optionally delete file
   */
  async removeMemoryBank(name: string, deleteFile: boolean = false): Promise<void> {
    const registry = await this.loadRegistry();
    
    if (!registry.banks[name]) {
      throw new Error(`Memory bank '${name}' not found`);
    }

    const bankPath = registry.banks[name].file_path;
    
    if (deleteFile) {
      try {
        await fs.unlink(bankPath);
        logger.info(`Deleted memory bank file: ${bankPath}`);
      } catch (error) {
        logger.warn(`Could not delete file ${bankPath}:`, error);
      }
    }

    delete registry.banks[name];
    await this.saveRegistry(registry);
    
    logger.info(`Removed memory bank '${name}' from registry`);
  }

  /**
   * Get file path for a memory bank
   */
  getMemoryBankPath(name: string): string {
    return path.join(this.memoryBanksDir, `${name}.mp4`);
  }

  /**
   * Check if memory bank file exists
   */
  async memoryBankExists(name: string): Promise<boolean> {
    const bankPath = this.getMemoryBankPath(name);
    try {
      await fs.access(bankPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size of memory bank
   */
  async getMemoryBankSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(): Promise<void> {
    if (!this.config.storage.cleanup_temp_files) {
      return;
    }

    try {
      const tempDir = path.join(process.cwd(), 'temp');
      const files = await fs.readdir(tempDir);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        // Remove files older than 1 hour
        if (Date.now() - stats.mtime.getTime() > 3600000) {
          await fs.unlink(filePath);
          logger.debug(`Cleaned up temp file: ${file}`);
        }
      }
    } catch (error) {
      logger.warn('Error cleaning up temp files:', error);
    }
  }
} 