import { perf } from './performance';

describe('Performance Tracker', () => {
    beforeEach(() => {
        perf.clear();
    });

    it('should start and end tracking a metric', () => {
        perf.start('test-metric');

        // Simulate some work by delaying just slightly 
        // performance.now() might be very fast, but should be >= 0
        perf.end('test-metric', { some: 'data' });

        const metrics = perf.getMetrics('test-metric');
        expect(metrics.length).toBe(1);
        expect(metrics[0].name).toBe('test-metric');
        expect(metrics[0].duration).toBeGreaterThanOrEqual(0);
        expect(metrics[0].metadata).toEqual({ some: 'data' });
    });

    it('should ignore end without start', () => {
        perf.end('non-existent');
        expect(perf.getMetrics('non-existent')).toEqual([]);
    });

    it('should generate statistics for multiple runs', () => {
        perf.start('multi-run');
        perf.end('multi-run');

        perf.start('multi-run');
        perf.end('multi-run');

        perf.start('multi-run');
        perf.end('multi-run');

        const stats = perf.getStats('multi-run');
        expect(stats).not.toBeNull();
        expect(stats?.count).toBe(3);

        // Duration is likely 0ms in an instant test run
        expect(stats?.avg).toBeGreaterThanOrEqual(0);
        expect(stats?.min).toBeGreaterThanOrEqual(0);
        expect(stats?.max).toBeGreaterThanOrEqual(0);
    });

    it('should clear specific metrics', () => {
        perf.start('metric-a');
        perf.end('metric-a');

        perf.start('metric-b');
        perf.end('metric-b');

        perf.clearMetrics('metric-a');

        expect(perf.getMetrics('metric-a')).toEqual([]);
        expect(perf.getMetrics('metric-b').length).toBe(1);
    });
});
