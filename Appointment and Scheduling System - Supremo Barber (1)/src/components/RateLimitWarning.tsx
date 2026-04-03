import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Shield } from "lucide-react";
import { Button } from "./ui/button";

interface RateLimitWarningProps {
  isOpen: boolean;
  reason: "burst_detected" | "rate_limit" | "blocked";
  retryAfter: number;
  endpoint?: string;
  onClose: () => void;
}

export function RateLimitWarning({
  isOpen,
  reason,
  retryAfter,
  endpoint,
  onClose,
}: RateLimitWarningProps) {
  const [countdown, setCountdown] = useState(retryAfter);

  useEffect(() => {
    if (!isOpen) return;

    setCountdown(retryAfter);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, retryAfter, onClose]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getTitle = () => {
    switch (reason) {
      case "burst_detected":
        return "🚨 Burst Detection - Too Many Requests!";
      case "rate_limit":
        return "⚠️ Rate Limit Exceeded";
      case "blocked":
        return "🛡️ Temporarily Blocked";
      default:
        return "⚠️ Too Many Requests";
    }
  };

  const getMessage = () => {
    switch (reason) {
      case "burst_detected":
        return "You've sent too many requests in a very short time. This looks like automated behavior and has been temporarily blocked to protect the system.";
      case "rate_limit":
        return "You've exceeded the maximum number of requests allowed. Please slow down and try again later.";
      case "blocked":
        return "Your account has been temporarily blocked due to excessive requests. This is a security measure to protect the system.";
      default:
        return "Too many requests detected. Please wait before continuing.";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border-4 border-red-500 animate-in zoom-in-95 duration-300">
        {/* Header with pulsing animation */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 animate-pulse" />
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="animate-bounce">
              <AlertTriangle className="w-12 h-12 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">
                {getTitle()}
              </h2>
              {endpoint && (
                <p className="text-red-100 text-sm">
                  Endpoint: {endpoint}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-gray-800 dark:text-gray-200 text-center leading-relaxed">
              {getMessage()}
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-[var(--color-primary)]" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Please wait before continuing
              </p>
            </div>
            
            <div className="text-6xl font-bold text-[var(--color-primary)] mb-2 transition-all duration-300">
              {formatTime(countdown)}
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-orange-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / retryAfter) * 100}%` }}
              />
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-1">
                  Why am I seeing this?
                </h4>
                <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                  {reason === "burst_detected"
                    ? "You sent 5 or more requests within 30 seconds. This protection prevents system abuse and ensures fair access for all users."
                    : "You've exceeded the allowed number of requests. This helps us maintain system stability and prevent abuse."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 dark:text-green-100 text-sm mb-1">
                  What should I do?
                </h4>
                <p className="text-green-700 dark:text-green-300 text-xs leading-relaxed">
                  Wait for the countdown to finish, then you can continue using the system normally. Please avoid sending too many requests too quickly.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={onClose}
            disabled={countdown > 0}
            className="w-full h-12 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {countdown > 0 ? `Wait ${formatTime(countdown)}` : "Continue"}
          </Button>

          {/* Footer Note */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            This page will automatically close when the timer reaches zero.
          </p>
        </div>
      </div>
    </div>
  );
}