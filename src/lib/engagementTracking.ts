/**
 * Engagement Tracking System
 * 
 * Tracks user engagement metrics:
 * - Scroll depth (25%, 50%, 75%, 100%)
 * - Time on page (5s, 15s, 30s, 60s, 120s milestones)
 * - Interaction events (clicks, form focus)
 * 
 * This data helps understand when users leave and what engages them.
 */

import { trackEvent } from "./analytics";

import { logger } from '@/lib/logger';
interface EngagementState {
  scrollMilestones: Set<number>;
  timeMilestones: Set<number>;
  startTime: number;
  isTracking: boolean;
  maxScrollDepth: number;
}

const state: EngagementState = {
  scrollMilestones: new Set(),
  timeMilestones: new Set(),
  startTime: 0,
  isTracking: false,
  maxScrollDepth: 0,
};

const SCROLL_MILESTONES = [25, 50, 75, 100];
const TIME_MILESTONES = [5, 15, 30, 60, 120, 180]; // seconds

/**
 * Calculate current scroll depth percentage
 */
function getScrollDepth(): number {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight;
  const clientHeight = document.documentElement.clientHeight;
  
  // Prevent division by zero
  if (scrollHeight <= clientHeight) return 100;
  
  const scrollableHeight = scrollHeight - clientHeight;
  const percentage = (scrollTop / scrollableHeight) * 100;
  
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Handle scroll events and track milestones
 */
function handleScroll(): void {
  const currentDepth = getScrollDepth();
  
  // Track max scroll depth
  if (currentDepth > state.maxScrollDepth) {
    state.maxScrollDepth = currentDepth;
  }
  
  // Check for milestone crossings
  for (const milestone of SCROLL_MILESTONES) {
    if (currentDepth >= milestone && !state.scrollMilestones.has(milestone)) {
      state.scrollMilestones.add(milestone);
      
      trackEvent('scroll_depth', {
        percentage: milestone,
        page_path: window.location.pathname,
        time_to_scroll: Math.round((Date.now() - state.startTime) / 1000),
      });
      
      if (import.meta.env.DEV) {
        logger.info(`📜 Scroll depth: ${milestone}%`);
      }
    }
  }
}

/**
 * Check and track time-on-page milestones
 */
function checkTimeMilestones(): void {
  if (!state.isTracking) return;
  
  const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
  
  for (const milestone of TIME_MILESTONES) {
    if (elapsedSeconds >= milestone && !state.timeMilestones.has(milestone)) {
      state.timeMilestones.add(milestone);
      
      trackEvent('time_on_page', {
        seconds: milestone,
        page_path: window.location.pathname,
        max_scroll_depth: Math.round(state.maxScrollDepth),
      });
      
      if (import.meta.env.DEV) {
        logger.info(`⏱️ Time on page: ${milestone}s (scroll: ${Math.round(state.maxScrollDepth)}%)`);
      }
    }
  }
}

/**
 * Track when user leaves the page
 */
function handlePageHide(): void {
  if (!state.isTracking) return;
  
  const totalTime = Math.round((Date.now() - state.startTime) / 1000);
  
  trackEvent('page_exit', {
    page_path: window.location.pathname,
    total_time_seconds: totalTime,
    max_scroll_depth: Math.round(state.maxScrollDepth),
    scroll_milestones_reached: Array.from(state.scrollMilestones),
    time_milestones_reached: Array.from(state.timeMilestones),
  });
  
  if (import.meta.env.DEV) {
    logger.info(`👋 Page exit: ${totalTime}s, ${Math.round(state.maxScrollDepth)}% scroll`);
  }
}

/**
 * Track interaction events (CTA clicks, form focus)
 */
export function trackInteraction(action: string, label?: string): void {
  const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
  
  trackEvent('user_interaction', {
    action,
    label: label || '',
    page_path: window.location.pathname,
    time_since_load: elapsedSeconds,
    scroll_depth: Math.round(state.maxScrollDepth),
  });
  
  if (import.meta.env.DEV) {
    logger.info(`🖱️ Interaction: ${action}${label ? ` (${label})` : ''}`);
  }
}

/**
 * Track CTA button clicks specifically
 */
export function trackCTAClick(buttonLabel: string, location: string): void {
  trackEvent('cta_click', {
    button_label: buttonLabel,
    location,
    page_path: window.location.pathname,
    time_since_load: Math.floor((Date.now() - state.startTime) / 1000),
    scroll_depth: Math.round(state.maxScrollDepth),
  });
}

/**
 * Initialize engagement tracking
 * Call this once on app startup
 */
export function initEngagementTracking(): void {
  // Skip if already tracking or not in browser
  if (state.isTracking || typeof window === 'undefined') return;
  
  state.startTime = Date.now();
  state.isTracking = true;
  
  // Throttle scroll handler for performance
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  const throttledScroll = () => {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
      handleScroll();
      scrollTimeout = null;
    }, 100);
  };
  
  // Set up scroll tracking
  window.addEventListener('scroll', throttledScroll, { passive: true });
  
  // Set up time milestone checking (every 5 seconds)
  const timeInterval = setInterval(checkTimeMilestones, 5000);
  
  // Track page exit
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      handlePageHide();
    }
  });
  
  // Also track beforeunload for immediate exits
  window.addEventListener('beforeunload', handlePageHide);
  
  // Check initial scroll position (for page reloads)
  handleScroll();
  
  // Clean up on page navigation (for SPA)
  window.addEventListener('popstate', () => {
    resetEngagementState();
  });
  
  if (import.meta.env.DEV) {
    logger.info('📊 Engagement tracking initialized');
  }
  
  // Store cleanup function for potential use
  (window as Window & { __cleanupEngagement?: () => void }).__cleanupEngagement = () => {
    window.removeEventListener('scroll', throttledScroll);
    clearInterval(timeInterval);
    state.isTracking = false;
  };
}

/**
 * Reset engagement state (for SPA navigation)
 */
export function resetEngagementState(): void {
  state.scrollMilestones.clear();
  state.timeMilestones.clear();
  state.startTime = Date.now();
  state.maxScrollDepth = 0;
}

/**
 * Get current engagement metrics (for debugging)
 */
export function getEngagementMetrics(): {
  timeOnPage: number;
  maxScrollDepth: number;
  scrollMilestones: number[];
  timeMilestones: number[];
} {
  return {
    timeOnPage: Math.floor((Date.now() - state.startTime) / 1000),
    maxScrollDepth: Math.round(state.maxScrollDepth),
    scrollMilestones: Array.from(state.scrollMilestones),
    timeMilestones: Array.from(state.timeMilestones),
  };
}
