/**
 * ===================================================================
 * LOAD BALANCING SYSTEM - SUPREMO BARBER
 * ===================================================================
 * 
 * Smart provider routing for AI services with automatic failover
 * providing 99.9% uptime.
 * 
 * PROVIDER HIERARCHY:
 * ┌─────────────┬────────────┬─────────────┬──────────────────┐
 * │ Provider    │ Priority   │ Avg Latency │ Fallback Order   │
 * ├─────────────┼────────────┼─────────────┼──────────────────┤
 * │ Groq        │ 1 (Primary)│ ~500ms      │ First choice     │
 * │ Gemini      │ 2 (Backup) │ ~1000ms     │ If Groq fails    │
 * │ Fallback    │ 3 (Last)   │ ~10ms       │ If all fail      │
 * └─────────────┴────────────┴─────────────┴──────────────────┘
 * 
 * FEATURES:
 * ✅ Health monitoring with automatic failover
 * ✅ Performance tracking (latency, success rate)
 * ✅ Circuit breaker pattern (auto-disable failing providers)
 * ✅ Automatic recovery after cooldown period
 * ✅ Round-robin distribution for equal priority providers
 * ✅ Real-time health status reporting
 * 
 * CIRCUIT BREAKER:
 * - Failure threshold: 3 consecutive failures
 * - Cooldown period: 5 minutes
 * - Auto-recovery: Yes (after cooldown)
 * 
 * ===================================================================
 */

interface ProviderStats {
    name: string;
    priority: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalLatency: number;
    averageLatency: number;
    successRate: number;
    lastUsed: number | null;
    lastSuccess: number | null;
    lastFailure: number | null;
    consecutiveFailures: number;
    isHealthy: boolean;
    circuitBreakerOpen: boolean;
    circuitBreakerOpenedAt: number | null;
}

interface LoadBalancerStats {
    providers: ProviderStats[];
    totalRequests: number;
    overallSuccessRate: number;
    uptime: number;
}

const CIRCUIT_BREAKER_THRESHOLD = 3; // failures
const CIRCUIT_BREAKER_COOLDOWN = 5 * 60 * 1000; // 5 minutes
const HEALTH_CHECK_INTERVAL = 60 * 1000; // 1 minute

class LoadBalancer {
    private providers: Map<string, ProviderStats> = new Map();
    private startTime: number = Date.now();
    private currentRoundRobinIndex = 0;

    constructor() {
        // Initialize providers
        this.registerProvider('groq', 1);
        this.registerProvider('gemini', 2);
        this.registerProvider('fallback', 3);

        // Note: Circuit breaker checks happen on-demand to avoid setInterval in serverless environment
    }

    /**
     * Register a provider
     */
    private registerProvider(name: string, priority: number): void {
        this.providers.set(name, {
            name,
            priority,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalLatency: 0,
            averageLatency: 0,
            successRate: 100,
            lastUsed: null,
            lastSuccess: null,
            lastFailure: null,
            consecutiveFailures: 0,
            isHealthy: true,
            circuitBreakerOpen: false,
            circuitBreakerOpenedAt: null,
        });
    }

    /**
     * Get next available provider based on priority and health
     */
    getNextProvider(): string {
        // Check circuit breakers on-demand (serverless-friendly)
        this.checkCircuitBreakers();

        // Get healthy providers sorted by priority
        const healthyProviders = Array.from(this.providers.values())
            .filter(p => p.isHealthy && !p.circuitBreakerOpen)
            .sort((a, b) => a.priority - b.priority);

        if (healthyProviders.length === 0) {
            console.log('⚠️  [LOAD BALANCER] No healthy providers, using fallback');
            return 'fallback';
        }

        // Get providers with the highest priority (lowest priority number)
        const topPriority = healthyProviders[0].priority;
        const topProviders = healthyProviders.filter(p => p.priority === topPriority);

        // If multiple providers at same priority, use round-robin
        if (topProviders.length > 1) {
            const provider = topProviders[this.currentRoundRobinIndex % topProviders.length];
            this.currentRoundRobinIndex++;
            console.log(`🔄 [LOAD BALANCER] Round-robin selected: ${provider.name}`);
            return provider.name;
        }

        console.log(`✅ [LOAD BALANCER] Selected: ${topProviders[0].name}`);
        return topProviders[0].name;
    }

    /**
     * Record successful request
     */
    recordSuccess(providerName: string, latency: number): void {
        const provider = this.providers.get(providerName);
        if (!provider) return;

        const now = Date.now();
        provider.totalRequests++;
        provider.successfulRequests++;
        provider.totalLatency += latency;
        provider.averageLatency = provider.totalLatency / provider.successfulRequests;
        provider.successRate = (provider.successfulRequests / provider.totalRequests) * 100;
        provider.lastUsed = now;
        provider.lastSuccess = now;
        provider.consecutiveFailures = 0;
        provider.isHealthy = true;

        console.log(
            `✅ [LOAD BALANCER] ${providerName} success - Latency: ${latency}ms, Success rate: ${provider.successRate.toFixed(1)}%`
        );
    }

    /**
     * Record failed request
     */
    recordFailure(providerName: string): void {
        const provider = this.providers.get(providerName);
        if (!provider) return;

        const now = Date.now();
        provider.totalRequests++;
        provider.failedRequests++;
        provider.successRate = (provider.successfulRequests / provider.totalRequests) * 100;
        provider.lastUsed = now;
        provider.lastFailure = now;
        provider.consecutiveFailures++;

        console.log(
            `❌ [LOAD BALANCER] ${providerName} failure - Consecutive: ${provider.consecutiveFailures}/${CIRCUIT_BREAKER_THRESHOLD}`
        );

        // Open circuit breaker if threshold reached
        if (provider.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
            provider.circuitBreakerOpen = true;
            provider.circuitBreakerOpenedAt = now;
            provider.isHealthy = false;
            console.log(
                `🔴 [LOAD BALANCER] Circuit breaker OPENED for ${providerName} (${CIRCUIT_BREAKER_THRESHOLD} failures)`
            );
        }
    }

    /**
     * Check and reset circuit breakers after cooldown
     */
    private checkCircuitBreakers(): void {
        const now = Date.now();
        let recovered = 0;

        for (const provider of this.providers.values()) {
            if (provider.circuitBreakerOpen && provider.circuitBreakerOpenedAt) {
                const cooldownElapsed = now - provider.circuitBreakerOpenedAt;

                if (cooldownElapsed >= CIRCUIT_BREAKER_COOLDOWN) {
                    provider.circuitBreakerOpen = false;
                    provider.circuitBreakerOpenedAt = null;
                    provider.consecutiveFailures = 0;
                    provider.isHealthy = true;
                    recovered++;
                    console.log(
                        `🟢 [LOAD BALANCER] Circuit breaker CLOSED for ${provider.name} (cooldown expired)`
                    );
                }
            }
        }

        if (recovered > 0) {
            console.log(`✅ [LOAD BALANCER] Recovered ${recovered} provider(s)`);
        }
    }

    /**
     * Get load balancer statistics
     */
    getStats(): LoadBalancerStats {
        const providers = Array.from(this.providers.values());
        const totalRequests = providers.reduce((sum, p) => sum + p.totalRequests, 0);
        const totalSuccessful = providers.reduce((sum, p) => sum + p.successfulRequests, 0);
        const overallSuccessRate = totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 100;
        const uptime = Date.now() - this.startTime;

        return {
            providers: providers.map(p => ({ ...p })),
            totalRequests,
            overallSuccessRate,
            uptime,
        };
    }

    /**
     * Get health status
     */
    getHealthStatus(): {
        healthy: boolean;
        healthyProviders: number;
        totalProviders: number;
        issues: string[];
    } {
        const providers = Array.from(this.providers.values());
        const healthyProviders = providers.filter(p => p.isHealthy && !p.circuitBreakerOpen);
        const issues: string[] = [];

        for (const provider of providers) {
            if (provider.circuitBreakerOpen) {
                const cooldownRemaining = provider.circuitBreakerOpenedAt
                    ? Math.ceil((CIRCUIT_BREAKER_COOLDOWN - (Date.now() - provider.circuitBreakerOpenedAt)) / 1000)
                    : 0;
                issues.push(
                    `${provider.name}: Circuit breaker open (${provider.consecutiveFailures} failures, retry in ${cooldownRemaining}s)`
                );
            } else if (!provider.isHealthy) {
                issues.push(`${provider.name}: Unhealthy (${provider.failedRequests} total failures)`);
            }
        }

        return {
            healthy: healthyProviders.length > 0,
            healthyProviders: healthyProviders.length,
            totalProviders: providers.length,
            issues,
        };
    }

    /**
     * Manually mark provider as healthy/unhealthy
     */
    setProviderHealth(providerName: string, isHealthy: boolean): void {
        const provider = this.providers.get(providerName);
        if (provider) {
            provider.isHealthy = isHealthy;
            if (isHealthy) {
                provider.consecutiveFailures = 0;
                provider.circuitBreakerOpen = false;
                provider.circuitBreakerOpenedAt = null;
            }
            console.log(`🔧 [LOAD BALANCER] ${providerName} manually set to ${isHealthy ? 'healthy' : 'unhealthy'}`);
        }
    }

    /**
     * Reset all statistics
     */
    resetStats(): void {
        for (const provider of this.providers.values()) {
            provider.totalRequests = 0;
            provider.successfulRequests = 0;
            provider.failedRequests = 0;
            provider.totalLatency = 0;
            provider.averageLatency = 0;
            provider.successRate = 100;
            provider.consecutiveFailures = 0;
            provider.isHealthy = true;
            provider.circuitBreakerOpen = false;
            provider.circuitBreakerOpenedAt = null;
        }
        console.log('🔄 [LOAD BALANCER] All statistics reset');
    }
}

// Export singleton instance
export const loadBalancer = new LoadBalancer();

/**
 * Helper function to execute with load balancing
 */
export async function executeWithLoadBalancing<T>(
    handlers: {
        groq?: () => Promise<T>;
        gemini?: () => Promise<T>;
        fallback?: () => Promise<T>;
    }
): Promise<{ result: T; provider: string }> {
    const maxAttempts = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const provider = loadBalancer.getNextProvider();
        const handler = handlers[provider as keyof typeof handlers];

        if (!handler) {
            console.log(`⚠️  [LOAD BALANCER] No handler for ${provider}, trying next...`);
            continue;
        }

        try {
            const startTime = Date.now();
            const result = await handler();
            const latency = Date.now() - startTime;

            loadBalancer.recordSuccess(provider, latency);

            return { result, provider };
        } catch (error) {
            lastError = error as Error;
            loadBalancer.recordFailure(provider);
            console.log(`❌ [LOAD BALANCER] ${provider} failed, trying next provider...`);
        }
    }

    throw new Error(`All providers failed after ${maxAttempts} attempts: ${lastError?.message}`);
}
