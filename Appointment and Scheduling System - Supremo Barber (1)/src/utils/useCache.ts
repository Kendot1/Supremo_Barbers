/**
 * React Hooks for Enhanced Cache Management
 * Easy-to-use hooks for accessing cached data in components
 */

import { useState, useEffect, useCallback } from 'react';
import { apiCache, cachedAPICall, DataCache, CacheConfig } from './apiCache';

// ============================================
// GENERIC CACHE HOOK
// ============================================

/**
 * Generic hook for cached data
 */
export function useCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig & { autoRefresh?: boolean; refreshInterval?: number } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const {
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000, // 5 minutes default
    ...cacheConfig
  } = config;

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (!forceRefresh) {
        const cached = apiCache.get<T>(key);
        if (cached !== null) {
          setData(cached);
          setFromCache(true);
          setLoading(false);
          return cached;
        }
      }

      // Fetch fresh data
      const result = await fetchFn();
      
      // Store in cache
      apiCache.set(key, result, cacheConfig);
      
      setData(result);
      setFromCache(false);
      setLoading(false);
      
      return result;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [key, cacheConfig]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);
  
  const invalidate = useCallback(() => {
    apiCache.invalidate(key);
    setData(null);
    setFromCache(false);
  }, [key]);

  return {
    data,
    loading,
    error,
    fromCache,
    refresh,
    invalidate,
  };
}

// ============================================
// CACHE STATS HOOK
// ============================================

/**
 * Hook to monitor cache performance
 */
export function useCacheStats() {
  const [stats, setStats] = useState(apiCache.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(apiCache.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}

// ============================================
// EXPORTS
// ============================================

export default useCache;
