/**
 * Google Analytics 4 Integration with Bot Filtering
 * Professional analytics tracking for AIWMC Quantis
 * 
 * Features:
 * - Spam referrer filtering
 * - Bot user-agent detection
 * - Session quality verification
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = 'G-NZE7RGVNEN';

// Known spam referrer patterns to filter out
const SPAM_REFERRER_PATTERNS = [
  /syndicatedsearch\.goog/i,
  /wealth\.kuninganmass\.com/i,
  /jasakonsultasipajak\.com/i,
  /semalt\.com/i,
  /buttons-for-website\.com/i,
  /darodar\.com/i,
  /ilovevitaly\.com/i,
  /priceg\.com/i,
  /blackhatworth\.com/i,
  /hulfingtonpost\.com/i,
  /prodvigator\.ua/i,
  /ranksonic\.info/i,
  /savetubevideo\.com/i,
  /kambasoft\.com/i,
  /lumb\.co/i,
  /humanoithemes\.com/i,
];

// Known bot user agent patterns
const BOT_USER_AGENT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
  /puppeteer/i,
  /slurp/i,
  /mediapartners/i,
];

// Cache the spam/bot check result
let isSpamSession: boolean | null = null;

/**
 * Check if current session appears to be from a bot or spam referrer
 */
function isSpamOrBot(): boolean {
  try {
    // Check referrer against spam patterns
    const referrer = document.referrer;
    if (referrer) {
      for (const pattern of SPAM_REFERRER_PATTERNS) {
        if (pattern.test(referrer)) {
          if (import.meta.env.DEV) {
            console.log(`🚫 Filtered spam referrer: ${referrer}`);
          }
          return true;
        }
      }
    }
    
    // Check user agent against bot patterns
    const userAgent = navigator.userAgent;
    for (const pattern of BOT_USER_AGENT_PATTERNS) {
      if (pattern.test(userAgent)) {
        if (import.meta.env.DEV) {
          console.log(`🤖 Filtered bot user agent: ${userAgent}`);
        }
        return true;
      }
    }
    
    // Check for suspicious behavior patterns
    // Headless browsers often have zero screen dimensions or missing plugins
    if (navigator.webdriver) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

function shouldTrack(): boolean {
  if (isSpamSession === null) {
    isSpamSession = isSpamOrBot();
  }
  return !isSpamSession;
}

/**
 * Initialize Google Analytics 4
 * GA is already loaded via index.html script tag
 * This function ensures gtag is available for custom events
 */
export function initAnalytics(): void {
  // GA is loaded via index.html, just verify it's available
  if (typeof window.gtag === 'function') {
    if (import.meta.env.DEV) {
      console.log('Google Analytics ready:', GA_MEASUREMENT_ID);
    }
  }
}

/**
 * Track page views (for SPA navigation)
 * Automatically filters spam/bot traffic
 */
export function trackPageView(path: string, title?: string): void {
  if (!shouldTrack()) return;
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title || document.title,
    session_quality: 'verified',
  });
}

/**
 * Track custom events
 * Automatically filters spam/bot traffic
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (!shouldTrack()) return;
  if (!window.gtag) return;

  window.gtag('event', eventName, {
    ...params,
    session_quality: 'verified',
  });
  
  if (import.meta.env.DEV) {
    console.log(`📈 Analytics: ${eventName}`, params);
  }
}

// ============================================
// Business-Specific Event Tracking Functions
// ============================================

/**
 * Track when user starts an analysis
 */
export function trackAnalysisStarted(idea: string, location: string): void {
  trackEvent('analysis_started', {
    idea_category: idea.substring(0, 50), // Truncate for privacy
    location: location,
  });
}

/**
 * Track when analysis completes successfully
 */
export function trackAnalysisCompleted(
  monthlyProfit: number,
  paybackMonths: number,
  confidenceScore: number
): void {
  trackEvent('analysis_completed', {
    monthly_profit_range: getProfitRange(monthlyProfit),
    payback_months: paybackMonths,
    confidence_score: confidenceScore,
  });
}

/**
 * Track user signup
 */
export function trackSignup(method: string = 'email'): void {
  trackEvent('sign_up', {
    method: method,
  });
}

/**
 * Track signup conversion for Google Ads
 * This fires on the Thank You page load for conversion attribution
 * ONLY for new signups - existing users logging in do NOT trigger this
 */
export function trackSignupConversion(): void {
  // GA4 sign_up event
  trackSignup('email');
  
  // Google Ads conversion event - fires the conversion_event_signup event
  if (window.gtag) {
    window.gtag('event', 'conversion_event_signup', {});
  }
  
  if (import.meta.env.DEV) {
    console.log('Signup conversion tracked: conversion_event_signup');
  }
}

/**
 * Track user login
 */
export function trackLogin(method: string = 'email'): void {
  trackEvent('login', {
    method: method,
  });
}

/**
 * Track checkout initiation
 */
export function trackCheckoutStart(planId: string, value?: number): void {
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: value || 0,
    items: [{ item_id: planId, item_name: planId }],
  });
}

/**
 * Track successful purchase/subscription
 */
export function trackPurchase(
  planId: string,
  transactionId: string,
  value: number
): void {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: 'USD',
    value: value,
    items: [{ item_id: planId, item_name: planId }],
  });
}

/**
 * Track PDF export
 */
export function trackPdfExport(): void {
  trackEvent('pdf_export', {
    content_type: 'business_analysis',
  });
}

/**
 * Track document upload
 */
export function trackDocumentUpload(fileType: string): void {
  trackEvent('document_upload', {
    file_type: fileType,
  });
}

/**
 * Track CTA clicks
 */
export function trackCtaClick(ctaName: string, location: string): void {
  trackEvent('cta_click', {
    cta_name: ctaName,
    cta_location: location,
  });
}

/**
 * Track errors (always tracked, even from bots for debugging)
 */
export function trackError(errorType: string, errorMessage: string): void {
  try {
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: `${errorType}: ${errorMessage}`,
        fatal: false,
      });
    }
  } catch {
    // Silently fail
  }
}

/**
 * Get session quality info (for debugging)
 */
export function getSessionQuality(): {
  isHuman: boolean;
  referrer: string;
  userAgent: string;
} {
  return {
    isHuman: shouldTrack(),
    referrer: document.referrer || 'direct',
    userAgent: navigator.userAgent,
  };
}

// ============================================
// Mobile Signup Conversion Tracking
// ============================================

/**
 * Track when a mobile user starts the signup process
 */
export function trackMobileSignupStarted(viewportWidth: number): void {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  trackEvent('mobile_signup_started', {
    viewport_width: viewportWidth,
    is_touch_device: isTouchDevice,
    form_version: 'simplified_v2',
  });
}

/**
 * Track when a mobile user completes signup
 */
export function trackMobileSignupCompleted(timeToCompleteMs: number): void {
  trackEvent('mobile_signup_completed', {
    time_to_complete_ms: timeToCompleteMs,
    time_to_complete_seconds: Math.round(timeToCompleteMs / 1000),
    form_version: 'simplified_v2',
  });
}

/**
 * Track simplified form conversion for A/B comparison
 */
export function trackSimplifiedFormConversion(formVersion: string, timeToSubmitMs?: number): void {
  trackEvent('simplified_form_conversion', {
    form_version: formVersion,
    time_to_submit_ms: timeToSubmitMs,
    time_to_submit_seconds: timeToSubmitMs ? Math.round(timeToSubmitMs / 1000) : undefined,
  });
}

/**
 * Track password validation for simplified requirements
 */
export function trackPasswordValidationPassed(passwordLength: number): void {
  trackEvent('password_validation_passed', {
    password_length: passwordLength,
    validation_mode: 'simplified',
    form_version: 'simplified_v2',
  });
}

// ============================================
// Helper Functions
// ============================================

function getProfitRange(profit: number): string {
  if (profit < 1000) return 'under_1k';
  if (profit < 5000) return '1k_5k';
  if (profit < 10000) return '5k_10k';
  if (profit < 25000) return '10k_25k';
  if (profit < 50000) return '25k_50k';
  return 'over_50k';
}
