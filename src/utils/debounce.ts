/**
 * Debounce and throttle utilities for optimizing frequent function calls
 */

/**
 * Debounce - only call function after wait milliseconds have passed since last call
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Throttle - call function at most once every wait milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 && timeout !== null) {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(context, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        if (timeout !== null) {
          timeout = null;
        }
        previous = Date.now();
        func.apply(context, args);
      }, remaining);
    }
  };
}

/**
 * RAF Throttle - throttle using requestAnimationFrame for optimal performance
 * Best for animations and UI updates
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      rafId = null;
      func.apply(context, args);
    });
  };
}

/**
 * Async debounce for async functions
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let promise: Promise<ReturnType<T>> | null = null;

  return function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const context = this;

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    if (!promise) {
      promise = (async () => {
        return new Promise<ReturnType<T>>((resolve, reject) => {
          timeout = setTimeout(async () => {
            timeout = null;
            try {
              const result = await func.apply(context, args);
              resolve(result);
            } catch (err) {
              reject(err);
            } finally {
              promise = null;
            }
          }, wait);
        });
      })();
    }

    return promise!;
  };
}

/**
 * Async throttle for async functions
 */
export function throttleAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let lastCall = 0;
  let promise: Promise<ReturnType<T>> | null = null;

  return function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const context = this;
    const now = Date.now();

    // If we're within the throttle window and have a pending promise, return it
    if (now - lastCall < wait && promise !== null) {
      return promise;
    }

    // Otherwise, create a new promise
    promise = (async () => {
      lastCall = now;
      try {
        const result = await func.apply(context, args);
        return result;
      } finally {
        promise = null;
      }
    })();

    return promise;
  };
}

/**
 * Leading debounce - call immediately on first call, then debounce
 */
export function debounceLeading<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastCall = 0;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;
    const now = Date.now();

    if (now - lastCall >= wait) {
      lastCall = now;
      func.apply(context, args);
    } else {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func.apply(context, args);
      }, wait - (now - lastCall));
    }
  };
}
