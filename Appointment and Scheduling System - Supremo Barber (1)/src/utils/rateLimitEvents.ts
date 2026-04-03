/**
 * Global event system for rate limit notifications
 * This allows the API service (which is not a React component) 
 * to trigger the rate limit modal in the React app
 */

interface RateLimitEventData {
  reason: "burst_detected" | "rate_limit" | "blocked";
  retryAfter: number;
  endpoint?: string;
}

type RateLimitListener = (data: RateLimitEventData) => void;

class RateLimitEventEmitter {
  private listeners: RateLimitListener[] = [];

  subscribe(listener: RateLimitListener) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(data: RateLimitEventData) {
    this.listeners.forEach(listener => listener(data));
  }
}

export const rateLimitEvents = new RateLimitEventEmitter();
