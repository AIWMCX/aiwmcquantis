/**
 * Performance utilities for debouncing, throttling, and idle task scheduling
 */

/**
 * Debounce - Execute after user stops action
 * Use for: Search inputs, form validation, resize events
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  return function executedFunction(...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle - Execute at most once per time period
 * Use for: Scroll events, mouse movements, API rate limiting
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if requestIdleCallback is available
 */
const hasIdleCallback = (): boolean => {
  return typeof window !== 'undefined' && 'requestIdleCallback' in window;
};

/**
 * Schedule low-priority tasks during browser idle time
 * Use for: Analytics, prefetching, background syncs
 */
export const scheduleIdleTask = (
  callback: () => void,
  options?: IdleRequestOptions
): number => {
  if (hasIdleCallback()) {
    return window.requestIdleCallback(() => callback(), options);
  }
  // Fallback for browsers without support or SSR
  return setTimeout(callback, 1) as unknown as number;
};

/**
 * Cancel a scheduled idle task
 */
export const cancelIdleTask = (id: number): void => {
  if (hasIdleCallback()) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};

/**
 * Measure and log performance metrics
 */
export const measurePerformance = (name: string, fn: () => void): void => {
  if (import.meta.env.DEV) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  } else {
    fn();
  }
};
