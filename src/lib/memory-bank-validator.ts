/**
 * Memory Bank Validator - Production Reliability
 * Validates memory bank existence, integrity, and health before operations
 */

import { logger } from './logger.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export interface MemoryBankValidation {
  bankName: string;
  isValid: boolean;
  exists: boolean;
  files: {
    mp4: { exists: boolean; size?: number; error?: string };
    faiss: { exists: boolean; size?: number; error?: string };
    json: { exists: boolean; size?: number; error?: string };
  };
  errors: string[];
  warnings: string[];
  lastValidated: Date;
}

export interface ValidationOptions {
  checkFileIntegrity?: boolean;
  autoCleanup?: boolean;
  validateContent?: boolean;
  requireAllFiles?: boolean;
}

export class MemoryBankValidator {
  private memoryBanksDir: string;
  private validationCache: Map<string, MemoryBankValidation> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  constructor(memoryBanksDir: string) {
    this.memoryBanksDir = memoryBanksDir;
  }

  /**
   * Validate a single memory bank
   */
  async validateBank(bankName: string, options: ValidationOptions = {}): Promise<MemoryBankValidation> {
    const startTime = Date.now();
    logger.info(`🔍 Validating memory bank: ${bankName}`);

    const validation: MemoryBankValidation = {
      bankName,
      isValid: false,
      exists: false,
      files: {
        mp4: { exists: false },
        faiss: { exists: false },
        json: { exists: false }
      },
      errors: [],
      warnings: [],
      lastValidated: new Date()
    };

    try {
      // Check if bank directory/files exist
      const bankFiles = this.getBankFilePaths(bankName);
      
      // Validate each required file
      for (const [fileType, filePath] of Object.entries(bankFiles)) {
        try {
          const fileExists = existsSync(filePath);
          validation.files[fileType as keyof typeof validation.files].exists = fileExists;

          if (fileExists) {
            const stats = await fs.stat(filePath);
            validation.files[fileType as keyof typeof validation.files].size = stats.size;

            // Check for empty files
            if (stats.size === 0) {
              validation.warnings.push(`${fileType.toUpperCase()} file is empty: ${filePath}`);
            }

            // File integrity checks
            if (options.checkFileIntegrity) {
              await this.validateFileIntegrity(filePath, fileType, validation);
            }
          } else {
            validation.errors.push(`Missing ${fileType.toUpperCase()} file: ${filePath}`);
          }
        } catch (error) {
          const errorMessage = `Error checking ${fileType} file: ${error instanceof Error ? error.message : String(error)}`;
          validation.errors.push(errorMessage);
          validation.files[fileType as keyof typeof validation.files].error = errorMessage;
        }
      }

      // Determine if bank exists (has at least MP4 file)
      validation.exists = validation.files.mp4.exists;

      // Determine overall validity
      if (options.requireAllFiles !== false) {
        // By default, require all three files for validity
        validation.isValid = validation.files.mp4.exists && 
                           validation.files.faiss.exists && 
                           validation.files.json.exists &&
                           validation.errors.length === 0;
      } else {
        // Only require MP4 file as minimum
        validation.isValid = validation.files.mp4.exists && validation.errors.length === 0;
      }

      // Cache the validation result
      this.validationCache.set(bankName, validation);

      const duration = Date.now() - startTime;
      logger.info(`✅ Memory bank validation complete: ${bankName} (${duration}ms) - Valid: ${validation.isValid}`);

      if (validation.errors.length > 0) {
        logger.warn(`❌ Validation errors for ${bankName}:`, validation.errors);
      }
      if (validation.warnings.length > 0) {
        logger.warn(`⚠️ Validation warnings for ${bankName}:`, validation.warnings);
      }

      return validation;
    } catch (error) {
      const errorMessage = `Critical validation error for ${bankName}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(errorMessage);
      validation.errors.push(errorMessage);
      return validation;
    }
  }

  /**
   * Validate multiple memory banks in parallel
   */
  async validateBanks(bankNames: string[], options: ValidationOptions = {}): Promise<Map<string, MemoryBankValidation>> {
    logger.info(`🔍 Validating ${bankNames.length} memory banks in parallel`);
    
    const validationPromises = bankNames.map(async (bankName) => {
      const validation = await this.validateBank(bankName, options);
      return [bankName, validation] as const;
    });

    const results = await Promise.allSettled(validationPromises);
    const validationMap = new Map<string, MemoryBankValidation>();

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const [bankName, validation] = result.value;
        validationMap.set(bankName, validation);
      } else {
        const bankName = bankNames[index];
        if (!bankName) {
          logger.error(`Failed to validate bank at index ${index}: bankName is undefined`);
          return;
        }
        logger.error(`Failed to validate bank ${bankName}:`, result.reason);
        validationMap.set(bankName, {
          bankName,
          isValid: false,
          exists: false,
          files: { mp4: { exists: false }, faiss: { exists: false }, json: { exists: false } },
          errors: [`Validation failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`],
          warnings: [],
          lastValidated: new Date()
        });
      }
    });

    const validCount = Array.from(validationMap.values()).filter(v => v.isValid).length;
    logger.info(`✅ Parallel validation complete: ${validCount}/${bankNames.length} banks valid`);

    return validationMap;
  }

  /**
   * Get cached validation or validate if cache is stale
   */
  async getCachedValidation(bankName: string, options: ValidationOptions = {}): Promise<MemoryBankValidation> {
    const cached = this.validationCache.get(bankName);
    const now = Date.now();
    
    if (cached && (now - cached.lastValidated.getTime()) < this.cacheExpiry) {
      logger.debug(`📋 Using cached validation for ${bankName}`);
      return cached;
    }

    logger.debug(`🔄 Cache miss or expired for ${bankName}, validating...`);
    return await this.validateBank(bankName, options);
  }

  /**
   * Check if a memory bank is ready for operations
   */
  async isMemoryBankReady(bankName: string, operationType: 'search' | 'create' | 'update' = 'search'): Promise<boolean> {
    try {
      // Set validation options based on operation type
      const validationOptions: ValidationOptions = {};
      
      switch (operationType) {
        case 'search':
          // For search, we only need the MP4 file
          validationOptions.requireAllFiles = false;
          break;
        case 'create':
          // For create, bank should not exist yet
          validationOptions.requireAllFiles = false;
          break;
        case 'update':
          // For update, bank should exist with all files
          validationOptions.requireAllFiles = true;
          break;
      }
      
      const validation = await this.validateBank(bankName, validationOptions);
      
      switch (operationType) {
        case 'search':
          // For search, we just need the MP4 file. 
          // The retriever might handle a missing index.
          return validation.files.mp4.exists;
        case 'create':
          // For create, bank should not exist yet
          return !validation.exists;
        case 'update':
          // For update, bank should exist with all files
          return validation.isValid;
        default:
          return validation.isValid;
      }
    } catch (error) {
      logger.error(`Error checking memory bank readiness for ${bankName}:`, error);
      return false;
    }
  }

  /**
   * Get list of all available memory banks with validation
   */
  async getAvailableMemoryBanks(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.memoryBanksDir);
      const mp4Files = files.filter(file => file.endsWith('.mp4'));
      const bankNames = mp4Files.map(file => file.replace('.mp4', ''));
      
      // Quick validation - just check if banks exist
      const validBanks: string[] = [];
      for (const bankName of bankNames) {
        const validation = await this.validateBank(bankName, { requireAllFiles: false });
        if (validation.exists) {
          validBanks.push(bankName);
        }
      }
      
      return validBanks;
    } catch (error) {
      logger.error('Error scanning memory banks directory:', error);
      return [];
    }
  }

  /**
   * Clean up invalid memory bank entries
   */
  async cleanupInvalidBanks(dryRun: boolean = true): Promise<{ removed: string[]; errors: string[] }> {
    logger.info(`🧹 Starting memory bank cleanup (dry run: ${dryRun})`);
    
    const result = { removed: [] as string[], errors: [] as string[] };
    
    try {
      const bankNames = await this.getAvailableMemoryBanks();
      
      for (const bankName of bankNames) {
        const validation = await this.validateBank(bankName);
        if (!validation.isValid && validation.errors.length > 0) {
          logger.warn(`🗑️ Invalid bank found: ${bankName}`, validation.errors);
          
          if (!dryRun) {
            try {
              // Remove partial files
              const bankFiles = this.getBankFilePaths(bankName);
              for (const filePath of Object.values(bankFiles)) {
                if (existsSync(filePath)) {
                  await fs.unlink(filePath);
                  logger.info(`Removed: ${filePath}`);
                }
              }
              result.removed.push(bankName);
            } catch (error) {
              const errorMessage = `Failed to remove ${bankName}: ${error instanceof Error ? error.message : String(error)}`;
              result.errors.push(errorMessage);
              logger.error(errorMessage);
            }
          } else {
            result.removed.push(bankName); // Would be removed
          }
        }
      }
      
      logger.info(`🧹 Cleanup complete: ${result.removed.length} banks ${dryRun ? 'would be' : 'were'} removed`);
      
    } catch (error) {
      const errorMessage = `Cleanup operation failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMessage);
      logger.error(errorMessage);
    }
    
    return result;
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    logger.debug('🗑️ Validation cache cleared');
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): { cacheSize: number; cacheHitRate: number } {
    return {
      cacheSize: this.validationCache.size,
      cacheHitRate: 0 // TODO: Implement cache hit tracking
    };
  }

  /**
   * Get file paths for a memory bank
   */
  private getBankFilePaths(bankName: string): { mp4: string; faiss: string; json: string } {
    return {
      mp4: path.join(this.memoryBanksDir, `${bankName}.mp4`),
      faiss: path.join(this.memoryBanksDir, `${bankName}.faiss`),
      json: path.join(this.memoryBanksDir, `${bankName}.json`)
    };
  }

  /**
   * Validate file integrity (basic checks)
   */
  private async validateFileIntegrity(filePath: string, fileType: string, validation: MemoryBankValidation): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      // Check file size constraints
      if (fileType === 'mp4' && stats.size < 1000) {
        validation.warnings.push(`MP4 file suspiciously small: ${stats.size} bytes`);
      }
      
      if (fileType === 'json') {
        // Try to parse JSON file
        const content = await fs.readFile(filePath, 'utf8');
        JSON.parse(content); // Will throw if invalid JSON
      }
      
      // TODO: Add more sophisticated integrity checks
      // - MP4 header validation
      // - FAISS index validation
      // - JSON schema validation
      
    } catch (error) {
      validation.errors.push(`File integrity check failed for ${fileType}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export default instance for convenience  
export const memoryBankValidator = new MemoryBankValidator('./memory-banks'); 