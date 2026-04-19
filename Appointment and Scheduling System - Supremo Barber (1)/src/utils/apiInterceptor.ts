import { rateLimiter, getUserRateLimitKey, formatRetryAfter } from "./rateLimiter";

interface ApiCallConfig {
  url: string;
  method: string;
  body?: any;
  headers?: any;
  userId?: string;
}

interface RateLimitError extends Error {
  isRateLimit: true;
  retryAfter: number;
  reason: "burst_detected" | "rate_limit" | "blocked";
  endpoint: string;
}

/**
 * Intercept and check rate limits for all API calls
 */
export async function apiCall(
  url: string,
  options: RequestInit = {},
  userId?: string
): Promise<Response> {
  // Determine endpoint type from URL
  const endpoint = getEndpointType(url);

  // Check rate limit before making request
  const rateLimitKey = getUserRateLimitKey(endpoint, userId);
  const rateLimit = rateLimiter.isAllowed(rateLimitKey);

  if (!rateLimit.allowed) {
    // Create a rate limit error
    const error = new Error(
      `Rate limit exceeded. Please try again in ${formatRetryAfter(rateLimit.retryAfter || 60)}.`
    ) as RateLimitError;
    error.isRateLimit = true;
    error.retryAfter = rateLimit.retryAfter || 60;
    error.reason = rateLimit.reason || "rate_limit";
    error.endpoint = endpoint;

    throw error;
  }

  // Make the actual API call
  try {
    const response = await fetch(url, options);

    // Check if server returned rate limit error
    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));

      const error = new Error(
        data.message || "Too many requests. Please try again later."
      ) as RateLimitError;
      error.isRateLimit = true;
      error.retryAfter = data.retryAfter || 60;
      error.reason = data.reason || "rate_limit";
      error.endpoint = endpoint;

      throw error;
    }

    return response;
  } catch (error: any) {
    // Re-throw rate limit errors
    if (error.isRateLimit) {
      throw error;
    }

    // For other errors, check if it might be network issue
    if (!error.response && error.message.includes("Failed to fetch")) {
      console.error("Network error:", error);
    }

    throw error;
  }
}

/**
 * Determine endpoint type from URL for rate limiting
 */
function getEndpointType(url: string): string {
  if (url.includes("/ai-chat")) return "ai:chat";
  if (url.includes("/auth/login")) return "auth:login";
  if (url.includes("/auth/register")) return "auth:register";
  if (url.includes("/auth/send-otp")) return "auth:otp";
  if (url.includes("/auth/verify-otp")) return "auth:otp";
  if (url.includes("/auth/forgot-password")) return "auth:otp";
  if (url.includes("/auth/reset-password")) return "auth:otp";
  if (url.includes("/booking")) return "booking:create";
  if (url.includes("/payment")) return "payment:upload";
  if (url.includes("/send-inquiry")) return "contact:send";

  // Default to general API rate limit
  return "api:general";
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: any): error is RateLimitError {
  return error?.isRateLimit === true;
}

/**
 * Helper to make API calls with automatic rate limit handling
 */
export async function safeApiCall<T = any>(
  url: string,
  options: RequestInit = {},
  userId?: string,
  onRateLimit?: (error: RateLimitError) => void
): Promise<T> {
  try {
    const response = await apiCall(url, options, userId);
    return await response.json();
  } catch (error: any) {
    if (isRateLimitError(error) && onRateLimit) {
      onRateLimit(error);
    }
    throw error;
  }
}
