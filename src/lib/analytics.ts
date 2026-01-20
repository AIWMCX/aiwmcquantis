/**
 * Google Analytics 4 Integration
 * Professional analytics tracking for AIWMC Quantis
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = 'G-NZE7RGVNEN';

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
 */
export function trackPageView(path: string, title?: string): void {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title || document.title,
  });
}

/**
 * Track custom events
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (!window.gtag) return;

  window.gtag('event', eventName, params);
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
 * 
 * To configure your Google Ads conversion:
 * 1. Replace 'AW-XXXXXXXXXX/XXXXXXXXXXXXX' with your actual conversion ID
 * 2. The conversion ID is found in Google Ads → Tools → Conversions → Your signup conversion
 */
export function trackSignupConversion(): void {
  // GA4 sign_up event
  trackSignup('email');
  
  // Google Ads conversion event
  // TODO: Replace with your actual Google Ads conversion ID
  if (window.gtag) {
    window.gtag('event', 'conversion', {
      'send_to': 'AW-XXXXXXXXXX/XXXXXXXXXXXXX', // Replace with your conversion ID
    });
  }
  
  if (import.meta.env.DEV) {
    console.log('Signup conversion tracked');
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
