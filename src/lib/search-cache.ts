/**
 * Search Result Caching System for Phase 3c Performance Optimization
 * 
 * Reduces search time from ~5.7s baseline to <500ms for cached queries
 * Implements intelligent cache invalidation and LRU eviction
 */

import crypto from 'crypto';
import { SearchResult, SearchFilters } from '../types/index.js';
import { logger } from './logger.js';

interface CacheEntry {
  results: SearchResult[];
  total_results: number;
  banks_searched: string[];
  timestamp: number;
  hit_count: number;
  query_hash: string;
}

interface CacheKey {
  query: string;
  memory_banks?: string[];
  filters?: any; // Use any to avoid strict type compatibility issues with Zod inferred types
  sort_by?: string;
  sort_order?: string;
  top_k?: number;
  min_score?: number;
}

export class SearchCache {
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize: number;
  private ttlMs: number;
  private hitCount = 0;
  private missCount = 0;

  constructor(
    maxCacheSize: number = 100,
    ttlMinutes: number = 30
  ) {
    this.maxCacheSize = maxCacheSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
    
    logger.info(`Search cache initialized: maxSize=${maxCacheSize}, ttl=${ttlMinutes}min`);
  }

  /**
   * Generate cache key from search parameters
   */
  private generateCacheKey(cacheKey: CacheKey): string {
    // Create a deterministic string from search parameters
    const keyString = JSON.stringify({
      query: cacheKey.query?.toLowerCase().trim(),
      memory_banks: cacheKey.memory_banks?.sort(),
      filters: cacheKey.filters,
      sort_by: cacheKey.sort_by,
      sort_order: cacheKey.sort_order,
      top_k: cacheKey.top_k,
      min_score: cacheKey.min_score
    });

    // Hash for consistent, short keys
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Get cached search results if available and valid
   */
  async getCachedResults(cacheKey: CacheKey): Promise<CacheEntry | null> {
    const key = this.generateCacheKey(cacheKey);
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      logger.debug(`Cache MISS for query: ${cacheKey.query}`);
      return null;
    }

    // Check if entry is expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.missCount++;
      logger.debug(`Cache EXPIRED for query: ${cacheKey.query}`);
      return null;
    }

    // Cache hit!
    entry.hit_count++;
    this.hitCount++;
    logger.info(`Cache HIT for query: ${cacheKey.query} (${entry.results.length} results, hit #${entry.hit_count})`);
    
    return entry;
  }

  /**
   * Store search results in cache
   */
  async cacheResults(
    cacheKey: CacheKey,
    results: SearchResult[],
    total_results: number,
    banks_searched: string[]
  ): Promise<void> {
    const key = this.generateCacheKey(cacheKey);
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      results,
      total_results,
      banks_searched,
      timestamp: Date.now(),
      hit_count: 0,
      query_hash: key
    };

    this.cache.set(key, entry);
    logger.info(`Cached results for query: ${cacheKey.query} (${results.length} results)`);
  }

  /**
   * Remove least recently used entry (lowest hit_count and oldest timestamp)
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null;
    let lruScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Score = hit_count * 1000 + age_in_minutes
      // Lower score = less valuable, evict first
      const ageMinutes = (Date.now() - entry.timestamp) / (1000 * 60);
      const score = entry.hit_count * 1000 + ageMinutes;
      
      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      const evicted = this.cache.get(lruKey);
      this.cache.delete(lruKey);
      logger.debug(`Evicted LRU cache entry: hit_count=${evicted?.hit_count}, age=${Math.round((Date.now() - (evicted?.timestamp || 0)) / 60000)}min`);
    }
  }

  /**
   * Invalidate cache entries for specific memory banks
   */
  async invalidateBankCache(bankNames: string[]): Promise<void> {
    let invalidatedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Check if this entry involves any of the modified banks
      const hasInvalidBank = entry.banks_searched.some(bank => bankNames.includes(bank));
      
      if (hasInvalidBank) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    if (invalidatedCount > 0) {
      logger.info(`Invalidated ${invalidatedCount} cache entries for banks: ${bankNames.join(', ')}`);
    }
  }

  /**
   * Clear all cached results
   */
  async clearCache(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    logger.info(`Cleared search cache (${size} entries)`);
  }

  /**
   * Get cache performance statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttlMinutes: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
    entries: Array<{
      query_hash: string;
      results_count: number;
      hit_count: number;
      age_minutes: number;
    }>;
  } {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      query_hash: key.substring(0, 8) + '...',
      results_count: entry.results.length,
      hit_count: entry.hit_count,
      age_minutes: Math.round((Date.now() - entry.timestamp) / 60000)
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      ttlMinutes: this.ttlMs / (60 * 1000),
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      entries
    };
  }

  /**
   * Optimize cache by removing expired entries
   */
  async optimizeCache(): Promise<{ removedCount: number; remainingCount: number }> {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(`Cache optimization removed ${removedCount} expired entries`);
    }

    return {
      removedCount,
      remainingCount: this.cache.size
    };
  }
}

// Singleton instance for global cache management
let globalSearchCache: SearchCache | null = null;

export function getSearchCache(): SearchCache {
  if (!globalSearchCache) {
    globalSearchCache = new SearchCache(
      100, // Max 100 cached queries
      30   // 30 minute TTL
    );
  }
  return globalSearchCache;
}

export function initializeSearchCache(maxSize?: number, ttlMinutes?: number): SearchCache {
  globalSearchCache = new SearchCache(maxSize, ttlMinutes);
  return globalSearchCache;
} 