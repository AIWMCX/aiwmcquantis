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

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/**
 * Initialize Google Analytics 4
 * Should be called once when the app loads
 */
export function initAnalytics(): void {
  if (!GA_MEASUREMENT_ID) {
    console.warn('GA Measurement ID not configured - analytics disabled');
    return;
  }

  // Prevent duplicate initialization
  if (window.gtag) {
    return;
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  
  // Define gtag function
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  // Initialize with timestamp
  window.gtag('js', new Date());
  
  // Configure GA4 with enhanced settings
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // We'll handle page views manually for SPA
    cookie_flags: 'SameSite=None;Secure',
    anonymize_ip: true,
  });

  // Load the gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  if (import.meta.env.DEV) {
    console.log('Google Analytics initialized:', GA_MEASUREMENT_ID);
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
