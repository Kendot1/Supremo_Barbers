import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { rateLimitEvents } from "../utils/rateLimitEvents";
import { rateLimiter, getUserRateLimitKey } from "../utils/rateLimiter";

interface RateLimitState {
  isBlocked: boolean;
  reason: "burst_detected" | "rate_limit" | "blocked";
  retryAfter: number;
  endpoint?: string;
}

interface RateLimitContextValue {
  rateLimitState: RateLimitState | null;
  showRateLimit: (reason: RateLimitState["reason"], retryAfter: number, endpoint?: string) => void;
  clearRateLimit: () => void;
}

const RateLimitContext = createContext<RateLimitContextValue | undefined>(undefined);

export function RateLimitProvider({ children }: { children: ReactNode }) {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState | null>(null);

  const showRateLimit = useCallback(
    (reason: RateLimitState["reason"], retryAfter: number, endpoint?: string) => {
      setRateLimitState({
        isBlocked: true,
        reason,
        retryAfter,
        endpoint,
      });
    },
    []
  );

  const clearRateLimit = useCallback(() => {
    setRateLimitState(null);
  }, []);

  // Check for existing rate limit blocks on mount (e.g., after page reload)
  useEffect(() => {
    // Check common endpoints for existing blocks
    const endpointsToCheck = [
      'auth:login',
      'auth:register', 
      'auth:otp',
      'ai:chat',
      'booking:create',
      'payment:upload',
      'contact:send',
      'api:general' // General API endpoints
    ];

    for (const endpoint of endpointsToCheck) {
      const key = getUserRateLimitKey(endpoint);
      const result = rateLimiter.isBlocked(key);
      
      if (result.blocked) {
        console.log('🚨 Found existing rate limit block on mount:', endpoint, result);
        // Show the rate limit modal immediately
        showRateLimit(
          result.reason as RateLimitState["reason"],
          result.retryAfter || 60,
          endpoint
        );
        
        // Only show one modal at a time
        break;
      }
    }
  }, [showRateLimit]);

  // Listen to global rate limit events from API service
  useEffect(() => {
    const unsubscribe = rateLimitEvents.subscribe((data) => {
      console.log('🚨 Rate limit event received:', data);
      showRateLimit(data.reason, data.retryAfter, data.endpoint);
    });

    return unsubscribe;
  }, [showRateLimit]);

  return (
    <RateLimitContext.Provider value={{ rateLimitState, showRateLimit, clearRateLimit }}>
      {children}
    </RateLimitContext.Provider>
  );
}

export function useRateLimit() {
  const context = useContext(RateLimitContext);
  if (!context) {
    throw new Error("useRateLimit must be used within RateLimitProvider");
  }
  return context;
}