/**
 * In-memory cache with TTL (Time To Live) support
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class Cache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 100, defaultTTL = 5000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key from arguments
   */
  generateKey(prefix: string, ...args: any[]): string {
    const serialized = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join('|');
    return `${prefix}:${serialized}`;
  }

  /**
   * Get cached value
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached value with optional TTL
   */
  set(key: string, data: T, ttl?: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * Delete specific key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get or compute value (cache miss handler)
   */
  async getOrSet(key: string, computeFn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached;

    const data = await computeFn();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Global API cache instance
export const apiCache = new Cache<any>(200, 10000); // 200 entries, 10s default TTL

// Clear cache utilities
export const clearSessionCache = (sessionId: string): void => {
  const keysToDelete = Array.from(apiCache['cache'].keys())
    .filter(key => key.includes(sessionId));
  keysToDelete.forEach(key => apiCache.delete(key));
};

export const clearAllCache = (): void => {
  apiCache.clear();
};
