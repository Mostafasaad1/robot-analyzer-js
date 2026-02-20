/**
 * Performance monitoring utilities for measuring component render times, API calls, etc.
 */

import * as React from 'react';

// Performance metrics interface
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Performance tracker class
class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private timers: Map<string, number> = new Map();
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled && process.env.NODE_ENV !== 'production';
  }

  /**
   * Start a timer for a named operation
   */
  start(name: string): void {
    if (!this.enabled) return;
    this.timers.set(name, performance.now());
  }

  /**
   * End a timer and record the metric
   */
  end(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const startTime = this.timers.get(name);
    if (startTime === undefined) return;

    const duration = performance.now() - startTime;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    });

    this.timers.delete(name);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`⚡ [Performance] ${name}: ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get metrics for a specific operation
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetric[]> {
    return new Map(this.metrics);
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(name: string): { min: number; max: number; avg: number; count: number } | null {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration);
    return {
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      count: metrics.length,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.timers.clear();
  }

  /**
   * Clear metrics for a specific operation
   */
  clearMetrics(name: string): void {
    this.metrics.delete(name);
    this.timers.delete(name);
  }

  /**
   * Measure an async function
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.enabled) return fn();

    this.start(name);
    try {
      const result = await fn();
      this.end(name, metadata);
      return result;
    } catch (error) {
      this.end(name, metadata);
      throw error;
    }
  }

  /**
   * Measure a synchronous function
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    if (!this.enabled) return fn();

    this.start(name);
    try {
      const result = fn();
      this.end(name, metadata);
      return result;
    } catch (error) {
      this.end(name, metadata);
      throw error;
    }
  }
}

// Global performance tracker instance
export const perf = new PerformanceTracker();

/**
 * React hook for measuring component render time
 */
export function useRenderTime(componentName: string) {
  React.useEffect(() => {
    perf.end(`render:${componentName}`);
  });

  // Note: Components need to call perf.start(`render:${componentName}`) themselves
  // or use the withRenderTime HOC below
}

/**
 * HOC to wrap components with render time tracking
 */
export function withRenderTime<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.FC<P> {
  const name = componentName || (WrappedComponent as any).name || 'AnonymousComponent';

  return React.memo(function RenderTimeWrapper(props: P) {
    const startTimeRef = React.useRef<number>(performance.now());

    React.useEffect(() => {
      const duration = performance.now() - startTimeRef.current;
      perf.end(`render:${name}`, { duration });
    });

    return React.createElement(WrappedComponent, props);
  });
}

/**
 * Log all performance metrics to console
 */
export function logPerformanceMetrics(): void {
  console.group('📊 Performance Metrics');

  perf.getAllMetrics().forEach((_metrics, name) => {
    const stats = perf.getStats(name);
    if (stats) {
      console.log(`📈 ${name}:`, {
        min: `${stats.min.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
        avg: `${stats.avg.toFixed(2)}ms`,
        count: stats.count,
      });
    }
  });

  console.groupEnd();
}

/**
 * Export performance metrics as JSON for analysis
 */
export function exportPerformanceMetrics(): string {
  const data: Record<string, any> = {};

  perf.getAllMetrics().forEach((metrics, name) => {
    const stats = perf.getStats(name);
    data[name] = {
      stats,
      samples: metrics.map(m => ({
        duration: m.duration,
        timestamp: m.timestamp,
      })),
    };
  });

  return JSON.stringify(data, null, 2);
}
