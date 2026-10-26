// Simple request cache to prevent duplicate API calls
// This improves performance by caching responses for a short time

interface CacheEntry {
    data: any;
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5000; // 5 seconds

export const requestCache = {
    get: (key: string): any | null => {
        const entry = cache.get(key);
        if (!entry) return null;

        const now = Date.now();
        if (now - entry.timestamp > CACHE_DURATION) {
            cache.delete(key);
            return null;
        }

        return entry.data;
    },

    set: (key: string, data: any): void => {
        cache.set(key, {
            data,
            timestamp: Date.now()
        });
    },

    clear: (key?: string): void => {
        if (key) {
            cache.delete(key);
        } else {
            cache.clear();
        }
    },

    clearAll: (): void => {
        cache.clear();
    }
};
