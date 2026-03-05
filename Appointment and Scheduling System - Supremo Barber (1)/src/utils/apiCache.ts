/**
 * Simple in-memory cache for API responses
 * Reduces redundant API calls and improves performance
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

class APICache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

    /**
     * Get cached data if available and not expired
     * @param key - Cache key
     * @returns Cached data or null if not found/expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        const now = Date.now();
        if (now > entry.expiresAt) {
            // Cache expired, remove it
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set cache data with optional TTL
     * @param key - Cache key
     * @param data - Data to cache
     * @param ttl - Time to live in milliseconds (default: 5 minutes)
     */
    set<T>(key: string, data: T, ttl?: number): void {
        const now = Date.now();
        const expiresAt = now + (ttl || this.defaultTTL);

        this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt,
        });
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

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}

// Export singleton instance
export const apiCache = new APICache();

/**
 * Helper function to create cache-wrapped API calls
 * @param key - Cache key
 * @param fetchFn - Function that returns a promise with data
 * @param ttl - Cache TTL in milliseconds
 */
export async function cachedAPICall<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
): Promise<T> {
    // Check cache first
    const cached = apiCache.get<T>(key);
    if (cached !== null) {
        return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Store in cache
    apiCache.set(key, data, ttl);

    return data;
}
