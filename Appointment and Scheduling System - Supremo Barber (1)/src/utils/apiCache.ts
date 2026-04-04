/**
 * Enhanced API Cache System for Supremo Barber
 * Combines in-memory caching with persistence, performance tracking, and advanced features
 * 
 * Features:
 * - In-memory caching with TTL
 * - Persistent storage (survives page reload)
 * - LRU eviction (removes least-used when full)
 * - Tag-based invalidation
 * - Performance tracking (hit rate, stats)
 * - Auto cleanup
 * - Pattern-based invalidation
 */

// ============================================
// INTERFACES & TYPES
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
  tags: string[];
  hits: number;
  persist: boolean;
}

interface CacheConfig {
  ttl?: number;
  tags?: string[];
  persist?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  persistedSize: number;
}

// ============================================
// ENHANCED API CACHE CLASS
// ============================================

class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default
  private maxSize: number = 200; // Max cache entries
  
  // Performance tracking
  private stats = {
    hits: 0,
    misses: 0,
  };

  // TTL presets
  readonly TTL = {
    SHORT: 1 * 60 * 1000,        // 1 minute
    MEDIUM: 5 * 60 * 1000,       // 5 minutes (default)
    LONG: 30 * 60 * 1000,        // 30 minutes
    HOUR: 60 * 60 * 1000,        // 1 hour
    DAY: 24 * 60 * 60 * 1000,    // 24 hours
  };

  constructor() {
    // Load persisted cache on initialization
    this.loadPersistedCache();
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
    
    // Auto-save to localStorage every minute
    setInterval(() => this.persistCache(), 60 * 1000);
  }

  /**
   * Get cached data if available and not expired
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      // Cache expired, remove it
      this.cache.delete(key);
      this.deletePersistedEntry(key);
      this.stats.misses++;
      return null;
    }

    // Update hit counter
    entry.hits++;
    this.stats.hits++;
    
    // Log cache hit (removed console.log to reduce noise)
    
    return entry.data as T;
  }

  /**
   * Set cache data with optional configuration
   * @param key - Cache key
   * @param data - Data to cache
   * @param config - Configuration (ttl, tags, persist)
   */
  set<T>(key: string, data: T, config?: number | CacheConfig): void {
    const now = Date.now();
    
    // Support legacy API: set(key, data, ttl)
    let ttl: number;
    let tags: string[] = [];
    let persist = false;

    if (typeof config === 'number') {
      ttl = config;
    } else if (config) {
      ttl = config.ttl || this.defaultTTL;
      tags = config.tags || [];
      persist = config.persist || false;
    } else {
      ttl = this.defaultTTL;
    }

    const expiresAt = now + ttl;

    // LRU eviction - remove least-used if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].hits - b[1].hits);
      const leastUsed = entries[0];
      if (leastUsed) {
        this.cache.delete(leastUsed[0]);
        this.deletePersistedEntry(leastUsed[0]);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt,
      key,
      tags,
      hits: 0,
      persist,
    };

    this.cache.set(key, entry);

    // Persist to localStorage if requested
    if (persist) {
      this.persistEntry(key, entry);
    }
  }

  /**
   * Check if key exists and is not expired
   * @param key - Cache key
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.deletePersistedEntry(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate (remove) specific cache entry
   * @param key - Cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.deletePersistedEntry(key);
    console.log(`🗑️ Cache invalidated: ${key}`);
  }

  /**
   * Invalidate all cache entries matching a pattern
   * @param pattern - RegExp pattern to match keys
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.deletePersistedEntry(key);
    });

    if (keysToDelete.length > 0) {
      console.log(`🗑️ Cache invalidated (pattern): ${keysToDelete.length} entries`);
    }
  }

  /**
   * Invalidate cache by tags
   * @param tags - Tags to invalidate
   */
  invalidateByTag(...tags: string[]): number {
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        this.deletePersistedEntry(key);
        count++;
      }
    }

    if (count > 0) {
      console.log(`🗑️ Cache invalidated (tags: ${tags.join(', ')}): ${count} entries`);
    }
    
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.clearPersistedCache();
    this.stats = { hits: 0, misses: 0 };
    console.log('🧹 All cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const persistedKeys = JSON.parse(localStorage.getItem('cache:keys') || '[]');
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      persistedSize: persistedKeys.length,
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.deletePersistedEntry(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: Removed ${cleaned} expired entries`);
    }
  }

  /**
   * Persist cache to localStorage
   */
  private persistCache(): void {
    try {
      const persistedKeys: string[] = [];
      
      for (const [key, entry] of this.cache.entries()) {
        // Only persist entries marked for persistence and not expired
        if (entry.persist && Date.now() < entry.expiresAt) {
          localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
          persistedKeys.push(key);
        }
      }
      
      localStorage.setItem('cache:keys', JSON.stringify(persistedKeys));
    } catch (error) {
      console.warn('⚠️ Failed to persist cache:', error);
    }
  }

  /**
   * Persist single entry
   */
  private persistEntry(key: string, entry: CacheEntry<any>): void {
    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
      
      // Update keys list
      const keys = JSON.parse(localStorage.getItem('cache:keys') || '[]');
      if (!keys.includes(key)) {
        keys.push(key);
        localStorage.setItem('cache:keys', JSON.stringify(keys));
      }
    } catch (error) {
      console.warn(`⚠️ Failed to persist entry ${key}:`, error);
    }
  }

  /**
   * Load persisted cache from localStorage
   */
  private loadPersistedCache(): void {
    try {
      const keys = JSON.parse(localStorage.getItem('cache:keys') || '[]');
      const now = Date.now();
      let loaded = 0;

      for (const key of keys) {
        const entryStr = localStorage.getItem(`cache:${key}`);
        if (entryStr) {
          const entry = JSON.parse(entryStr);
          
          // Only load non-expired entries
          if (entry.expiresAt > now) {
            this.cache.set(key, entry);
            loaded++;
          } else {
            localStorage.removeItem(`cache:${key}`);
          }
        }
      }

      if (loaded > 0) {
        console.log(`📦 Loaded ${loaded} cached entries from storage`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load persisted cache:', error);
    }
  }

  /**
   * Delete persisted entry
   */
  private deletePersistedEntry(key: string): void {
    try {
      localStorage.removeItem(`cache:${key}`);
      
      const keys = JSON.parse(localStorage.getItem('cache:keys') || '[]');
      const filtered = keys.filter((k: string) => k !== key);
      localStorage.setItem('cache:keys', JSON.stringify(filtered));
    } catch (error) {
      // Silent fail - not critical
    }
  }

  /**
   * Clear all persisted cache
   */
  private clearPersistedCache(): void {
    try {
      const keys = JSON.parse(localStorage.getItem('cache:keys') || '[]');
      for (const key of keys) {
        localStorage.removeItem(`cache:${key}`);
      }
      localStorage.removeItem('cache:keys');
    } catch (error) {
      console.warn('⚠️ Failed to clear persisted cache:', error);
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const apiCache = new APICache();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Helper function to create cache-wrapped API calls
 * @param key - Cache key
 * @param fetchFn - Function that returns a promise with data
 * @param ttl - Cache TTL in milliseconds or config object
 */
export async function cachedAPICall<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number | CacheConfig
): Promise<T> {
  // Check cache first
  const cached = apiCache.get<T>(key);
  if (cached !== null) {
    console.log(`✅ Cache HIT: ${key}`);
    return cached;
  }

  console.log(`❌ Cache MISS: ${key} - Fetching fresh data`);

  // Fetch fresh data
  const data = await fetchFn();
  
  // Store in cache
  apiCache.set(key, data, ttl);
  
  return data;
}

// ============================================
// DATA CACHE HELPERS
// ============================================

export const DataCache = {
  // Appointments caching
  appointments: {
    getAll: () => apiCache.get<any[]>('appointments:all'),
    setAll: (data: any[]) => 
      apiCache.set('appointments:all', data, {
        ttl: apiCache.TTL.MEDIUM,
        tags: ['appointments'],
        persist: true,
      }),
    getByUser: (userId: string) => 
      apiCache.get<any[]>(`appointments:user:${userId}`),
    setByUser: (userId: string, data: any[]) =>
      apiCache.set(`appointments:user:${userId}`, data, {
        ttl: apiCache.TTL.MEDIUM,
        tags: ['appointments', `user:${userId}`],
        persist: true,
      }),
    invalidate: () => apiCache.invalidateByTag('appointments'),
  },

  // Users caching
  users: {
    getAll: () => apiCache.get<any[]>('users:all'),
    setAll: (data: any[]) =>
      apiCache.set('users:all', data, {
        ttl: apiCache.TTL.LONG,
        tags: ['users'],
        persist: true,
      }),
    getById: (id: string) => apiCache.get<any>(`user:${id}`),
    setById: (id: string, data: any) =>
      apiCache.set(`user:${id}`, data, {
        ttl: apiCache.TTL.LONG,
        tags: ['users', `user:${id}`],
        persist: true,
      }),
    invalidate: () => apiCache.invalidateByTag('users'),
  },

  // Services caching
  services: {
    getAll: () => apiCache.get<any[]>('services:all'),
    setAll: (data: any[]) =>
      apiCache.set('services:all', data, {
        ttl: apiCache.TTL.HOUR,
        tags: ['services'],
        persist: true,
      }),
    invalidate: () => apiCache.invalidateByTag('services'),
  },

  // Analytics caching
  analytics: {
    get: (key: string) => apiCache.get<any>(`analytics:${key}`),
    set: (key: string, data: any) =>
      apiCache.set(`analytics:${key}`, data, {
        ttl: apiCache.TTL.MEDIUM,
        tags: ['analytics'],
        persist: false, // Analytics shouldn't persist
      }),
    invalidate: () => apiCache.invalidateByTag('analytics'),
  },
};

// ============================================
// EXPORTS
// ============================================

export default apiCache;
export type { CacheEntry, CacheConfig, CacheStats };