/**
 * Performance Monitoring Utilities
 * Track and log performance metrics in development
 */

interface PerformanceMetric {
    name: string;
    duration: number;
    timestamp: number;
}

class PerformanceMonitor {
    private metrics: Map<string, number> = new Map();
    private history: PerformanceMetric[] = [];
    private maxHistory = 100;

    /**
     * Start measuring performance for a named operation
     * @param name - Unique identifier for the operation
     */
    start(name: string): void {
        this.metrics.set(name, performance.now());
    }

    /**
     * End measuring and log the duration
     * @param name - Unique identifier for the operation
     * @param logToConsole - Whether to log to console (default: true in dev)
     */
    end(name: string, logToConsole: boolean = process.env.NODE_ENV === 'development'): number {
        const startTime = this.metrics.get(name);

        if (!startTime) {
            console.warn(`Performance: No start time found for "${name}"`);
            return 0;
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Store in history
        this.history.push({
            name,
            duration,
            timestamp: Date.now(),
        });

        // Keep history size manageable
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        // Clean up
        this.metrics.delete(name);

        // Log to console in development
        if (logToConsole) {
            console.log(`⚡ Performance: ${name} took ${duration.toFixed(2)}ms`);
        }

        return duration;
    }

    /**
     * Measure a function's execution time
     * @param name - Name of the operation
     * @param fn - Function to measure
     */
    async measure<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
        this.start(name);
        try {
            const result = await fn();
            this.end(name);
            return result;
        } catch (error) {
            this.end(name);
            throw error;
        }
    }

    /**
     * Get performance statistics for a specific operation
     * @param name - Operation name
     */
    getStats(name: string) {
        const relatedMetrics = this.history.filter(m => m.name === name);

        if (relatedMetrics.length === 0) {
            return null;
        }

        const durations = relatedMetrics.map(m => m.duration);
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);

        return {
            name,
            count: relatedMetrics.length,
            average: avg,
            min,
            max,
        };
    }

    /**
     * Get all performance history
     */
    getHistory(): PerformanceMetric[] {
        return [...this.history];
    }

    /**
     * Clear all metrics and history
     */
    clear(): void {
        this.metrics.clear();
        this.history = [];
    }

    /**
     * Log summary of all operations
     */
    logSummary(): void {
        const operations = new Set(this.history.map(m => m.name));

        console.group('⚡ Performance Summary');
        operations.forEach(name => {
            const stats = this.getStats(name);
            if (stats) {
                console.log(
                    `${name}: avg ${stats.average.toFixed(2)}ms, min ${stats.min.toFixed(2)}ms, max ${stats.max.toFixed(2)}ms (${stats.count} calls)`
                );
            }
        });
        console.groupEnd();
    }
}

// Export singleton instance
export const perfMonitor = new PerformanceMonitor();

/**
 * Higher-order component wrapper for measuring render time
 */
export function withPerformanceTracking<P extends object>(
    Component: React.ComponentType<P>,
    componentName: string
): React.ComponentType<P> {
    return (props: P) => {
        if (process.env.NODE_ENV === 'development') {
            perfMonitor.start(`${componentName} render`);
        }

        const result = Component(props);

        if (process.env.NODE_ENV === 'development') {
            // Use setTimeout to measure after React commits
            setTimeout(() => {
                perfMonitor.end(`${componentName} render`);
            }, 0);
        }

        return result;
    };
}

/**
 * Report Web Vitals metrics
 */
export function reportWebVitals() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
        return;
    }

    // Largest Contentful Paint (LCP)
    try {
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('📊 LCP:', lastEntry.renderTime || lastEntry.loadTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
        // Ignore if not supported
    }

    // First Input Delay (FID)
    try {
        const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
                console.log('📊 FID:', entry.processingStart - entry.startTime);
            });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
        // Ignore if not supported
    }

    // Cumulative Layout Shift (CLS)
    try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                    clsValue += (entry as any).value;
                }
            }
            console.log('📊 CLS:', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
        // Ignore if not supported
    }
}
