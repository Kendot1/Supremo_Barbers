/**
 * Rate Limiter Utility - Client Side
 * Provides basic rate limiting for API calls
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
  requestTimestamps: number[]; // Track individual request times for burst detection
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();
  private readonly STORAGE_KEY = 'supremo_rate_limits';

  // Burst detection settings
  private readonly BURST_THRESHOLD = 5; // Number of requests to trigger burst detection
  private readonly BURST_WINDOW_MS = 30 * 1000; // 30 seconds window
  private readonly BURST_BLOCK_MS = 2 * 60 * 1000; // 2 minutes block for burst

  constructor() {
    // Load rate limits from localStorage on initialization
    this.loadFromStorage();
    
    // Save to localStorage every 5 seconds
    setInterval(() => this.saveToStorage(), 5000);
    
    // Also save on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.saveToStorage());
    }
  }

  /**
   * Load rate limits from localStorage
   */
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.limits = new Map(Object.entries(data));
        console.log('📥 Rate limits loaded from storage:', this.limits.size, 'entries');
      }
    } catch (error) {
      console.error('Failed to load rate limits from storage:', error);
    }
  }

  /**
   * Save rate limits to localStorage
   */
  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.limits.entries());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save rate limits to storage:', error);
    }
  }

  /**
   * Configure rate limit for a specific key
   */
  configure(key: string, config: RateLimitConfig) {
    this.configs.set(key, config);
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): { allowed: boolean; retryAfter?: number; reason?: string } {
    // Try to get config for the exact key first
    let config = this.configs.get(key);
    
    // If no exact match, try to get config for the base endpoint (without user ID)
    if (!config) {
      const baseKey = key.split(':').slice(0, 2).join(':'); // e.g., "auth:login:user123" -> "auth:login"
      config = this.configs.get(baseKey);
    }
    
    if (!config) {
      // No config = no limit
      return { allowed: true };
    }

    const now = Date.now();
    let entry = this.limits.get(key);

    // Check if blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      return { allowed: false, retryAfter, reason: 'blocked' };
    }

    // Reset window if expired
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
        requestTimestamps: [],
      };
      this.limits.set(key, entry);
    }

    // BURST DETECTION: Check for rapid-fire requests (INCLUDING this request)
    const recentTimestamps = entry.requestTimestamps.filter(
      timestamp => now - timestamp < this.BURST_WINDOW_MS
    );

    // IMPORTANT: Count this current request as well (+1)
    if (recentTimestamps.length + 1 >= this.BURST_THRESHOLD) {
      // Burst detected! Block the user
      entry.blockedUntil = now + this.BURST_BLOCK_MS;
      entry.requestTimestamps = [...recentTimestamps, now];
      this.limits.set(key, entry);
      
      // Save to storage immediately when blocking
      this.saveToStorage();
      
      const retryAfter = Math.ceil(this.BURST_BLOCK_MS / 1000);
      console.warn(`🚨 [BURST DETECTED] ${key} - ${recentTimestamps.length + 1} requests in ${this.BURST_WINDOW_MS / 1000}s - Blocked for ${retryAfter}s`);
      
      return { 
        allowed: false, 
        retryAfter, 
        reason: 'burst_detected' 
      };
    }

    // Check normal rate limit
    if (entry.count >= config.maxRequests) {
      // Block if configured
      if (config.blockDurationMs) {
        entry.blockedUntil = now + config.blockDurationMs;
        this.limits.set(key, entry);
        
        // Save to storage immediately when blocking
        this.saveToStorage();
      }

      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return { allowed: false, retryAfter, reason: 'rate_limit' };
    }

    // Increment count and track timestamp
    entry.count++;
    entry.requestTimestamps.push(now);
    
    // Keep only recent timestamps (last 1 minute)
    entry.requestTimestamps = entry.requestTimestamps.filter(
      timestamp => now - timestamp < 60000
    );
    
    this.limits.set(key, entry);

    return { allowed: true };
  }

  /**
   * Check if currently blocked (without incrementing counter)
   */
  isBlocked(key: string): { blocked: boolean; retryAfter?: number; reason?: string } {
    const now = Date.now();
    const entry = this.limits.get(key);

    // Check if blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      return { blocked: true, retryAfter, reason: 'blocked' };
    }

    return { blocked: false };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string) {
    this.limits.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll() {
    this.limits.clear();
  }

  /**
   * Get remaining requests
   */
  getRemaining(key: string): number {
    const config = this.configs.get(key);
    if (!config) return Infinity;

    const entry = this.limits.get(key);
    if (!entry) return config.maxRequests;

    const now = Date.now();
    if (entry.resetTime <= now) return config.maxRequests;

    return Math.max(0, config.maxRequests - entry.count);
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Pre-configured rate limits
export const RateLimitPresets = {
  // Authentication endpoints - strict
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes block after limit
  },
  
  // AI Chat - moderate
  AI_CHAT: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes block
  },
  
  // Booking - moderate
  BOOKING: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
    blockDurationMs: 10 * 60 * 1000, // 10 minutes block
  },
  
  // Payment - strict
  PAYMENT: {
    maxRequests: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes block
  },
  
  // General API - lenient
  GENERAL: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Contact form - moderate
  CONTACT: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours block
  },
};

// Initialize presets
rateLimiter.configure('auth:login', RateLimitPresets.AUTH);
rateLimiter.configure('auth:register', RateLimitPresets.AUTH);
rateLimiter.configure('auth:otp', RateLimitPresets.AUTH);
rateLimiter.configure('ai:chat', RateLimitPresets.AI_CHAT);
rateLimiter.configure('booking:create', RateLimitPresets.BOOKING);
rateLimiter.configure('payment:upload', RateLimitPresets.PAYMENT);
rateLimiter.configure('contact:send', RateLimitPresets.CONTACT);
rateLimiter.configure('api:general', RateLimitPresets.GENERAL); // All other API endpoints

/**
 * Helper to create user-specific rate limit keys
 */
export function getUserRateLimitKey(endpoint: string, userId?: string): string {
  return userId ? `${endpoint}:${userId}` : `${endpoint}:anonymous`;
}

/**
 * Format retry-after message
 */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}