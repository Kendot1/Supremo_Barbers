import { useRateLimit } from "../contexts/RateLimitContext";
import { RateLimitWarning } from "./RateLimitWarning";

export function AppWithRateLimit({ children }: { children: React.ReactNode }) {
  const { rateLimitState, clearRateLimit } = useRateLimit();

  return (
    <>
      {children}
      {rateLimitState && (
        <RateLimitWarning
          isOpen={rateLimitState.isBlocked}
          reason={rateLimitState.reason}
          retryAfter={rateLimitState.retryAfter}
          endpoint={rateLimitState.endpoint}
          onClose={clearRateLimit}
        />
      )}
    </>
  );
}
