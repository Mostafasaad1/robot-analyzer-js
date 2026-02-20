/**
 * Browser performance utilities for optimized animations and rendering
 */

// RAF helpers
let rafId: number | null = null;
let scheduledCallbacks: Array<() => void> = [];

/**
 * Schedule a function to run on the next animation frame
 * Multiple calls in the same frame are coalesced
 */
export function scheduleRaf(callback: () => void): void {
  scheduledCallbacks.push(callback);
  
  if (rafId === null) {
    rafId = requestAnimationFrame(() => {
      const callbacks = scheduledCallbacks;
      scheduledCallbacks = [];
      rafId = null;
      
      callbacks.forEach(cb => {
        try {
          cb();
        } catch (err) {
          console.error('Error in RAF callback:', err);
        }
      });
    });
  }
}

/**
 * Cancel all scheduled RAF callbacks
 */
export function cancelScheduledRaf(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  scheduledCallbacks = [];
}

/**
 * Idle callback for low-priority tasks
 */
export function scheduleIdle(callback: () => void, timeout = 5000): void {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback, { timeout });
  } else {
    // Fallback to setTimeout for browsers without requestIdleCallback
    setTimeout(callback, 1);
  }
}

/**
 * Throttle function using requestAnimationFrame
 * Only executes on animation frames, ideal for UI updates
 */
export function rafThrottle<T extends (...args: any[]) => void>(
  fn: T,
  leading = true
): (...args: Parameters<T>) => void {
  let lastArgs: Parameters<T> | null = null;
  let scheduled = false;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (leading && !scheduled) {
      scheduled = true;
      fn.apply(context, args);
      scheduleRaf(() => {
        scheduled = false;
        if (lastArgs) {
          fn.apply(context, lastArgs);
          lastArgs = null;
        }
      });
    } else {
      lastArgs = args;
      scheduleRaf(() => {
        scheduled = false;
        if (lastArgs) {
          fn.apply(context, lastArgs);
          lastArgs = null;
        }
      });
    }
  };
}

/**
 * Check if the current frame is within the expected time budget
 * Useful for pacing work in animation loops
 */
export function isTimeBudgetAvailable(budgetMs = 8): boolean {
  return performance.now() % 16.67 < budgetMs;
}

/**
 * Measure and log frame rate
 */
export class FPSCounter {
  private frames: number[] = [];
  private lastTime: number;
  private enabled: boolean;

  constructor(enabled = import.meta.env.DEV) {
    this.enabled = enabled;
    this.lastTime = performance.now();
  }

  tick(): void {
    if (!this.enabled) return;
    
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    
    const fps = 1000 / delta;
    this.frames.push(fps);
    
    // Keep only last 60 frames
    if (this.frames.length > 60) {
      this.frames.shift();
    }
    
    // Log every second
    if (this.frames.length % 60 === 0) {
      const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
      console.log(`🎬 FPS: ${avg.toFixed(1)}`);
    }
  }

  getAverage(): number {
    if (this.frames.length === 0) return 0;
    return this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
  }

  clear(): void {
    this.frames = [];
  }
}
