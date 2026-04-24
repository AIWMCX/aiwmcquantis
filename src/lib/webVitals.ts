/**
 * Core Web Vitals Monitoring System
 * 
 * Tracks the key performance metrics that Google uses for ranking:
 * - LCP (Largest Contentful Paint): < 2.5s good, > 4s poor
 * - FID (First Input Delay): < 100ms good, > 300ms poor
 * - CLS (Cumulative Layout Shift): < 0.1 good, > 0.25 poor
 * - TTFB (Time to First Byte): < 200ms good, > 600ms poor
 * - FCP (First Contentful Paint): < 1.8s good, > 3s poor
 */

import { trackEvent } from "./analytics";

import { logger } from '@/lib/logger';
interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

// Thresholds based on Google's Core Web Vitals guidelines
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 200, poor: 600 },
  FCP: { good: 1800, poor: 3000 },
  INP: { good: 200, poor: 500 },
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'needs-improvement';
  
  if (value <= threshold.good) return 'good';
  if (value >= threshold.poor) return 'poor';
  return 'needs-improvement';
}

function sendToAnalytics(metric: WebVitalMetric) {
  // Only track if analytics is available
  trackEvent('web_vitals', {
    metric_name: metric.name,
    metric_value: Math.round(metric.value),
    metric_rating: metric.rating,
    metric_delta: Math.round(metric.delta),
    metric_id: metric.id,
    page_path: window.location.pathname,
  });
  
  // Also log to console in development
  if (import.meta.env.DEV) {
    const color = metric.rating === 'good' ? '🟢' : metric.rating === 'poor' ? '🔴' : '🟡';
    logger.info(`${color} Web Vital: ${metric.name} = ${metric.value.toFixed(2)} (${metric.rating})`);
  }
}

/**
 * Observe Largest Contentful Paint
 */
function observeLCP(callback: (metric: WebVitalMetric) => void) {
  if (!('PerformanceObserver' in window)) return;
  
  let lcpValue = 0;
  const lcpId = `lcp-${Date.now()}`;
  
  const observer = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
    lcpValue = lastEntry.startTime;
  });
  
  try {
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // LCP not supported
    return;
  }
  
  // Report on page hide or after load
  const reportLCP = () => {
    if (lcpValue > 0) {
      callback({
        name: 'LCP',
        value: lcpValue,
        rating: getRating('LCP', lcpValue),
        delta: lcpValue,
        id: lcpId,
      });
    }
  };
  
  // Report when page becomes hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      reportLCP();
      observer.disconnect();
    }
  }, { once: true });
  
  // Also report after page load stabilizes
  window.addEventListener('load', () => {
    setTimeout(reportLCP, 0);
  });
}

/**
 * Observe First Input Delay
 */
function observeFID(callback: (metric: WebVitalMetric) => void) {
  if (!('PerformanceObserver' in window)) return;
  
  const fidId = `fid-${Date.now()}`;
  
  const observer = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries() as (PerformanceEntry & { processingStart: number; startTime: number })[];
    const firstInput = entries[0];
    
    if (firstInput) {
      const fid = firstInput.processingStart - firstInput.startTime;
      callback({
        name: 'FID',
        value: fid,
        rating: getRating('FID', fid),
        delta: fid,
        id: fidId,
      });
      observer.disconnect();
    }
  });
  
  try {
    observer.observe({ type: 'first-input', buffered: true });
  } catch {
    // FID not supported
  }
}

/**
 * Observe Cumulative Layout Shift
 */
function observeCLS(callback: (metric: WebVitalMetric) => void) {
  if (!('PerformanceObserver' in window)) return;
  
  let clsValue = 0;
  const clsId = `cls-${Date.now()}`;
  let sessionValue = 0;
  let sessionEntries: PerformanceEntry[] = [];
  
  const observer = new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
      // Only count layout shifts without recent user input
      if (!entry.hadRecentInput) {
        const firstSessionEntry = sessionEntries[0] as (PerformanceEntry & { startTime: number }) | undefined;
        const lastSessionEntry = sessionEntries[sessionEntries.length - 1] as (PerformanceEntry & { startTime: number }) | undefined;
        
        // If entry is within 1 second and 5 seconds of session, add to session
        if (sessionEntries.length && 
            entry.startTime - (lastSessionEntry?.startTime || 0) < 1000 &&
            entry.startTime - (firstSessionEntry?.startTime || 0) < 5000) {
          sessionValue += entry.value;
          sessionEntries.push(entry);
        } else {
          // Start new session
          sessionValue = entry.value;
          sessionEntries = [entry];
        }
        
        // Keep the max session value
        if (sessionValue > clsValue) {
          clsValue = sessionValue;
        }
      }
    }
  });
  
  try {
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // CLS not supported
    return;
  }
  
  // Report on page hide
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && clsValue > 0) {
      callback({
        name: 'CLS',
        value: clsValue,
        rating: getRating('CLS', clsValue),
        delta: clsValue,
        id: clsId,
      });
      observer.disconnect();
    }
  }, { once: true });
}

/**
 * Observe Time to First Byte
 */
function observeTTFB(callback: (metric: WebVitalMetric) => void) {
  const ttfbId = `ttfb-${Date.now()}`;
  
  // Use Navigation Timing API
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  
  if (navEntry) {
    const ttfb = navEntry.responseStart - navEntry.requestStart;
    callback({
      name: 'TTFB',
      value: ttfb,
      rating: getRating('TTFB', ttfb),
      delta: ttfb,
      id: ttfbId,
    });
  }
}

/**
 * Observe First Contentful Paint
 */
function observeFCP(callback: (metric: WebVitalMetric) => void) {
  if (!('PerformanceObserver' in window)) return;
  
  const fcpId = `fcp-${Date.now()}`;
  
  const observer = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint') as PerformanceEntry & { startTime: number } | undefined;
    
    if (fcpEntry) {
      callback({
        name: 'FCP',
        value: fcpEntry.startTime,
        rating: getRating('FCP', fcpEntry.startTime),
        delta: fcpEntry.startTime,
        id: fcpId,
      });
      observer.disconnect();
    }
  });
  
  try {
    observer.observe({ type: 'paint', buffered: true });
  } catch {
    // FCP not supported
  }
}

/**
 * Initialize all Web Vitals observers
 * Call this once on app startup
 */
export function initWebVitals(): void {
  // Skip if not in browser
  if (typeof window === 'undefined') return;
  
  // Wait for page to be fully loaded
  if (document.readyState === 'complete') {
    startObserving();
  } else {
    window.addEventListener('load', startObserving);
  }
}

function startObserving() {
  // Small delay to not interfere with page load
  setTimeout(() => {
    observeLCP(sendToAnalytics);
    observeFID(sendToAnalytics);
    observeCLS(sendToAnalytics);
    observeTTFB(sendToAnalytics);
    observeFCP(sendToAnalytics);
    
    if (import.meta.env.DEV) {
      logger.info('📊 Web Vitals monitoring initialized');
    }
  }, 0);
}

/**
 * Get current Web Vitals summary (for debugging)
 */
export function getWebVitalsSummary(): Record<string, number | null> {
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const paintEntries = performance.getEntriesByType('paint');
  const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint') as PerformanceEntry & { startTime: number } | undefined;
  
  return {
    ttfb: navEntry ? navEntry.responseStart - navEntry.requestStart : null,
    fcp: fcpEntry?.startTime ?? null,
    domComplete: navEntry?.domComplete ?? null,
    loadComplete: navEntry?.loadEventEnd ?? null,
  };
}
