/**
 * 🏗️ Enterprise Load Balancing System
 * 
 * Features:
 * - Health monitoring & circuit breaker
 * - Smart routing to fastest provider
 * - Load distribution across providers
 * - Performance metrics tracking
 * - Automatic failure recovery
 */

export type AIProvider = 'groq' | 'gemini' | 'fallback';

export interface ProviderHealth {
  provider: AIProvider;
  isHealthy: boolean;
  isCircuitOpen: boolean;
  consecutiveFailures: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  errorRate: number;
  uptime: number; // percentage
}

export interface LoadBalancerMetrics {
  providers: Record<AIProvider, ProviderHealth>;
  totalRequests: number;
  routingDecisions: {
    provider: AIProvider;
    reason: string;
    timestamp: number;
  }[];
}

class LoadBalancerService {
  private metrics: LoadBalancerMetrics;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // failures before circuit opens
  private readonly CIRCUIT_RECOVERY_TIME = 60000; // 1 minute
  private readonly MAX_LATENCY_THRESHOLD = 5000; // 5 seconds = unhealthy

  constructor() {
    this.metrics = this.initializeMetrics();
    this.loadMetricsFromStorage();
  }

  private initializeMetrics(): LoadBalancerMetrics {
    const createProviderHealth = (provider: AIProvider): ProviderHealth => ({
      provider,
      isHealthy: true,
      isCircuitOpen: false,
      consecutiveFailures: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      errorRate: 0,
      uptime: 100,
    });

    return {
      providers: {
        groq: createProviderHealth('groq'),
        gemini: createProviderHealth('gemini'),
        fallback: createProviderHealth('fallback'),
      },
      totalRequests: 0,
      routingDecisions: [],
    };
  }

  private loadMetricsFromStorage(): void {
    try {
      const stored = localStorage.getItem('ai_load_balancer_metrics');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.metrics = { ...this.metrics, ...parsed };

      }
    } catch (error) {
      console.warn('⚠️ [LOAD BALANCER] Failed to load metrics:', error);
    }
  }

  private saveMetricsToStorage(): void {
    try {
      // Keep only last 50 routing decisions to avoid storage bloat
      const metricsToSave = {
        ...this.metrics,
        routingDecisions: this.metrics.routingDecisions.slice(-50),
      };
      localStorage.setItem('ai_load_balancer_metrics', JSON.stringify(metricsToSave));
    } catch (error) {
      console.warn('⚠️ [LOAD BALANCER] Failed to save metrics:', error);
    }
  }

  /**
   * 🎯 Get recommended provider (simple version for frontend)
   */
  getProvider(): AIProvider {
    // Frontend just requests - backend does smart routing
    return 'groq'; // Default, backend will handle failover
  }

  /**
   * 🧠 Smart Routing Algorithm
   * Selects the best provider based on health, latency, and availability
   */
  selectProvider(availableProviders: AIProvider[]): AIProvider {
    const now = Date.now();

    // Filter out providers with open circuits that haven't recovered
    const healthyProviders = availableProviders.filter(provider => {
      const health = this.metrics.providers[provider];

      // Check if circuit is open and if recovery time has passed
      if (health.isCircuitOpen) {
        const timeSinceFailure = health.lastFailureTime
          ? now - health.lastFailureTime
          : Infinity;

        if (timeSinceFailure > this.CIRCUIT_RECOVERY_TIME) {
          // Try to recover - circuit half-open

          health.isCircuitOpen = false;
          health.consecutiveFailures = 0;
          return true;
        }


        return false;
      }

      return health.isHealthy;
    });

    if (healthyProviders.length === 0) {
      console.warn('⚠️ [LOAD BALANCER] No healthy providers, using fallback');
      this.recordRoutingDecision('fallback', 'No healthy providers available');
      return 'fallback';
    }

    // Score each provider based on performance
    const scoredProviders = healthyProviders.map(provider => {
      const health = this.metrics.providers[provider];

      // Calculate score (higher is better)
      let score = 100;

      // Penalize high latency
      if (health.averageLatency > 0) {
        score -= Math.min(50, (health.averageLatency / 100)); // -0.5 per 100ms
      }

      // Penalize high error rate
      score -= health.errorRate * 50; // -50 for 100% error rate

      // Bonus for high uptime
      score += (health.uptime / 10); // +10 for 100% uptime

      // Bonus for recent success
      if (health.lastSuccessTime) {
        const timeSinceSuccess = now - health.lastSuccessTime;
        if (timeSinceSuccess < 60000) { // within last minute
          score += 20;
        }
      }

      // Prefer Groq (it's faster)
      if (provider === 'groq') score += 10;

      return { provider, score, health };
    });

    // Sort by score (highest first)
    scoredProviders.sort((a, b) => b.score - a.score);

    const selected = scoredProviders[0];
    const reason = `Best score: ${selected.score.toFixed(1)} (latency: ${selected.health.averageLatency}ms, uptime: ${selected.health.uptime.toFixed(1)}%)`;


    this.recordRoutingDecision(selected.provider, reason);

    return selected.provider;
  }

  /**
   * 📝 Record successful request
   */
  recordSuccess(provider: AIProvider, latency: number): void {
    const health = this.metrics.providers[provider];
    const now = Date.now();

    health.totalRequests++;
    health.successfulRequests++;
    health.consecutiveFailures = 0; // Reset failures
    health.lastSuccessTime = now;
    health.isHealthy = true;
    health.isCircuitOpen = false; // Close circuit on success

    // Update average latency (exponential moving average)
    if (health.averageLatency === 0) {
      health.averageLatency = latency;
    } else {
      health.averageLatency = (health.averageLatency * 0.7) + (latency * 0.3);
    }

    // Update metrics
    this.updateMetrics(provider);


    this.saveMetricsToStorage();
  }

  /**
   * ❌ Record failed request
   */
  recordFailure(provider: AIProvider, error?: string): void {
    const health = this.metrics.providers[provider];
    const now = Date.now();

    health.totalRequests++;
    health.failedRequests++;
    health.consecutiveFailures++;
    health.lastFailureTime = now;

    // Open circuit breaker if threshold exceeded
    if (health.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      health.isCircuitOpen = true;
      health.isHealthy = false;
      console.error(`🔴 [CIRCUIT BREAKER] ${provider} circuit opened after ${health.consecutiveFailures} failures`);
    }

    // Update metrics
    this.updateMetrics(provider);

    console.error(`❌ [LOAD BALANCER] ${provider} failure (${health.consecutiveFailures} consecutive)${error ? `: ${error}` : ''}`);

    this.saveMetricsToStorage();
  }

  private updateMetrics(provider: AIProvider): void {
    const health = this.metrics.providers[provider];

    // Calculate error rate
    if (health.totalRequests > 0) {
      health.errorRate = health.failedRequests / health.totalRequests;
    }

    // Calculate uptime
    if (health.totalRequests > 0) {
      health.uptime = (health.successfulRequests / health.totalRequests) * 100;
    }
  }

  private recordRoutingDecision(provider: AIProvider, reason: string): void {
    this.metrics.totalRequests++;
    this.metrics.routingDecisions.push({
      provider,
      reason,
      timestamp: Date.now(),
    });

    // Keep only last 100 decisions
    if (this.metrics.routingDecisions.length > 100) {
      this.metrics.routingDecisions = this.metrics.routingDecisions.slice(-100);
    }
  }

  /**
   * 📊 Get current metrics
   */
  getMetrics(): LoadBalancerMetrics {
    return JSON.parse(JSON.stringify(this.metrics));
  }

  /**
   * 🔄 Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    localStorage.removeItem('ai_load_balancer_metrics');

  }

  /**
   * 🏥 Get health status summary
   */
  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'critical';
    providers: {
      provider: AIProvider;
      status: 'healthy' | 'unhealthy' | 'circuit_open';
      details: string;
    }[];
  } {
    const providerStatuses = Object.values(this.metrics.providers).map(health => {
      let status: 'healthy' | 'unhealthy' | 'circuit_open';
      let details: string;

      if (health.isCircuitOpen) {
        status = 'circuit_open';
        const timeSinceFailure = health.lastFailureTime
          ? Math.round((Date.now() - health.lastFailureTime) / 1000)
          : 0;
        details = `Circuit open - ${timeSinceFailure}s since failure`;
      } else if (!health.isHealthy || health.errorRate > 0.5) {
        status = 'unhealthy';
        details = `Error rate: ${(health.errorRate * 100).toFixed(1)}%`;
      } else {
        status = 'healthy';
        details = `Uptime: ${health.uptime.toFixed(1)}%, Latency: ${health.averageLatency.toFixed(0)}ms`;
      }

      return {
        provider: health.provider,
        status,
        details,
      };
    });

    // Determine overall health
    const healthyCount = providerStatuses.filter(p => p.status === 'healthy').length;
    let overall: 'healthy' | 'degraded' | 'critical';

    if (healthyCount >= 2) {
      overall = 'healthy';
    } else if (healthyCount === 1) {
      overall = 'degraded';
    } else {
      overall = 'critical';
    }

    return {
      overall,
      providers: providerStatuses,
    };
  }
}

// Singleton instance
export const loadBalancer = new LoadBalancerService();
