import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * Google Analytics 4 + Supabase Funnel Sink (Session 2 / SOW §6.1)
 * ================================================================
 * Dual-writer:
 *  - GA4 receives every event for marketing analytics
 *  - Supabase `funnel_events` receives the 8 SOW canonical events for
 *    the /admin/funnel dashboard. We write via the
 *    `record_funnel_event` RPC (SECURITY DEFINER, anon-callable).
 *
 * Features:
 * - Spam referrer filtering
 * - Bot user-agent detection
 * - Session quality verification
 * - Stable session_id stored in sessionStorage for funnel attribution
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
  // Additional Indonesian spam domains
  /\.id$/i, // Indonesian TLD - common source of spam traffic
  /konsultan.*\.com/i, // Indonesian consulting spam
  /pajak.*online/i, // Tax-related spam
  /jasa.*\.com/i, // Service-related Indonesian spam
  // Additional global spam patterns
  /free-share-buttons\.com/i,
  /social-buttons\.com/i,
  /event-tracking\.com/i,
  /get-free-traffic\.com/i,
  /trafficmonetize\.org/i,
  /adcash\.com/i,
  /popcash\.net/i,
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
            logger.info(`🚫 Filtered spam referrer: ${referrer}`);
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
          logger.info(`🤖 Filtered bot user agent: ${userAgent}`);
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
      logger.info('Google Analytics ready:', GA_MEASUREMENT_ID);
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
    logger.info(`📈 Analytics: ${eventName}`, params);
  }
}

// ============================================
// SOW §6.1 Canonical Funnel Events (Session 2)
// ============================================
// 8 canonical events that flow into the /admin/funnel dashboard via the
// `record_funnel_event` SECURITY DEFINER RPC. We always also forward to
// GA4 so marketing keeps its existing reports.

export type SowFunnelEvent =
  | 'home_view'
  | 'free_signup_start'
  | 'free_signup_complete'
  | 'analysis_start'
  | 'analysis_complete'
  | 'pricing_view'
  | 'paid_checkout_start'
  | 'paid_checkout_complete'
  // Prompt 3 canonical conversion funnel (audit 16-Jun-2026).
  // Order: idea_submitted → analysis_started → analysis_completed (north-star)
  //        → verdict_viewed → upgrade_cta_seen {surface} → subscription_started
  | 'idea_submitted'
  | 'analysis_started'
  | 'analysis_completed'
  | 'verdict_viewed'
  | 'upgrade_cta_seen'
  | 'subscription_started'
  | 'vs_page_view';

const SESSION_KEY = 'aiwmc_funnel_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36));
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

function readUtm(): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
} {
  if (typeof window === 'undefined') return {};
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get('utm_source') || undefined,
      utm_medium: p.get('utm_medium') || undefined,
      utm_campaign: p.get('utm_campaign') || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Record a canonical SOW funnel event (writes to Supabase + GA4).
 * Safe to call from anon and authed contexts. Bot/spam sessions are
 * skipped to keep the funnel clean.
 */
export function recordFunnelEvent(
  eventName: SowFunnelEvent,
  metadata: Record<string, unknown> = {},
): void {
  if (!shouldTrack()) return;

  // 1. GA4 mirror (keeps marketing dashboards intact)
  trackEvent(eventName, metadata);

  // 2. Supabase sink (powers /admin/funnel)
  try {
    const utm = readUtm();
    const path = typeof window !== 'undefined' ? window.location.pathname : null;
    const referrer = typeof document !== 'undefined' ? document.referrer || null : null;

    // Fire-and-forget; never block the UI on analytics.
    void supabase
      .rpc('record_funnel_event', {
        _event_name: eventName,
        _session_id: getSessionId(),
        _path: path,
        _referrer: referrer,
        _utm_source: utm.utm_source ?? null,
        _utm_medium: utm.utm_medium ?? null,
        _utm_campaign: utm.utm_campaign ?? null,
        _metadata: metadata as never,
      })
      .then(({ error }) => {
        if (error && import.meta.env.DEV) {
          logger.warn(`funnel_event RPC failed for ${eventName}`, error);
        }
      });
  } catch (err) {
    if (import.meta.env.DEV) {
      logger.warn(`funnel_event sink threw for ${eventName}`, err);
    }
  }
}


/**
 * Track when user starts an analysis
 */
export function trackAnalysisStarted(idea: string, location: string): void {
  trackEvent('analysis_started', {
    idea_category: idea.substring(0, 50), // Truncate for privacy
    location: location,
  });
  // SOW canonical alias
  recordFunnelEvent('analysis_start', { location });
  // Prompt 3 canonical
  recordFunnelEvent('analysis_started', { location });
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
  // SOW canonical alias
  recordFunnelEvent('analysis_complete', {
    monthly_profit_range: getProfitRange(monthlyProfit),
    payback_months: paybackMonths,
    confidence_score: confidenceScore,
  });
  // Prompt 3 canonical (north-star activation event)
  recordFunnelEvent('analysis_completed', {
    monthly_profit_range: getProfitRange(monthlyProfit),
    payback_months: paybackMonths,
    confidence_score: confidenceScore,
  });
}

/**
 * Track user signup completion (post-confirmation)
 */
export function trackSignup(method: string = 'email'): void {
  trackEvent('sign_up', {
    method: method,
  });
  // SOW canonical alias
  recordFunnelEvent('free_signup_complete', { method });
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
    logger.info('Signup conversion tracked: conversion_event_signup');
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
  // SOW canonical alias
  recordFunnelEvent('paid_checkout_start', { plan_id: planId, value: value || 0 });
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
  // SOW canonical alias
  recordFunnelEvent('paid_checkout_complete', {
    plan_id: planId,
    transaction_id: transactionId,
    value,
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
// Pricing Page Conversion Tracking
// ============================================

/**
 * Track pricing section viewed
 */
export function trackPricingSectionViewed(variant: string, billingPeriod: string): void {
  trackEvent('pricing_section_viewed', {
    variant,
    billing_period: billingPeriod,
  });
}

/**
 * Track billing toggle interaction
 */
export function trackPricingToggle(from: string, to: string, variant: string): void {
  trackEvent('pricing_toggle_clicked', {
    from,
    to,
    variant,
  });
}

/**
 * Track pricing FAQ expansion
 */
export function trackPricingFaqExpanded(questionId: string): void {
  trackEvent('pricing_faq_expanded', {
    question_id: questionId,
  });
}

/**
 * Track pricing CTA click
 */
export function trackPricingCtaClick(plan: string, variant: string, billingPeriod: string): void {
  trackEvent('pricing_cta_clicked', {
    plan,
    variant,
    billing_period: billingPeriod,
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

// ============================================
// Email Capture & Lead Magnet Tracking
// ============================================

/**
 * Track popup trigger event
 */
export function trackPopupTriggered(type: string, source: string, offer: string): void {
  trackEvent('popup_triggered', { type, source, offer });
}

/**
 * Track popup view event
 */
export function trackPopupViewed(type: string, source: string, offer: string): void {
  trackEvent('popup_viewed', { type, source, offer });
}

/**
 * Track popup dismissal
 */
export function trackPopupDismissed(type: string, source: string, offer: string, timeOnPopupMs?: number): void {
  trackEvent('popup_dismissed', { 
    type, 
    source, 
    offer,
    time_on_popup_ms: timeOnPopupMs,
  });
}

/**
 * Track popup conversion (email submitted)
 */
export function trackPopupConverted(type: string, source: string, offer: string, emailDomain?: string): void {
  trackEvent('popup_converted', { 
    type, 
    source, 
    offer,
    email_domain: emailDomain,
  });
}

/**
 * Track lead magnet request
 */
export function trackLeadMagnetRequested(offer: string, source: string): void {
  trackEvent('lead_magnet_requested', { offer, source });
}

/**
 * Track lead magnet download
 */
export function trackLeadMagnetDownloaded(offer: string, source: string): void {
  trackEvent('lead_magnet_downloaded', { offer, source });
}

/**
 * Track newsletter subscription
 */
export function trackNewsletterSubscribed(source: string): void {
  trackEvent('newsletter_subscribed', { source });
}

/**
 * Track waitlist join
 */
export function trackWaitlistJoined(feature: string, source: string): void {
  trackEvent('waitlist_joined', { feature, source });
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
// Retention & Engagement Tracking
// ============================================

/**
 * Track streak achievement
 */
export function trackStreakAchieved(days: number, badge: string): void {
  trackEvent('streak_achieved', { days, badge });
}

/**
 * Track milestone reached
 */
export function trackMilestoneReached(milestone: string): void {
  trackEvent('milestone_reached', { milestone });
}

/**
 * Track notification clicked
 */
export function trackNotificationClicked(type: string, notificationId: string): void {
  trackEvent('notification_clicked', { type, notification_id: notificationId });
}

/**
 * Track churn risk elevation
 */
export function trackChurnRiskElevated(previous: number, current: number, tier: string): void {
  trackEvent('churn_risk_elevated', { previous, current, user_tier: tier });
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

// ============================================
// Enhanced Engagement Tracking (Phase 5)
// ============================================

// Scroll depth tracking state
let scrollDepthTracked = new Set<number>();

/**
 * Track scroll depth milestones (25%, 50%, 75%, 100%)
 */
export function initScrollDepthTracking(): void {
  if (typeof window === 'undefined') return;
  
  const trackScrollDepth = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);
    
    const milestones = [25, 50, 75, 100];
    milestones.forEach(milestone => {
      if (scrollPercent >= milestone && !scrollDepthTracked.has(milestone)) {
        scrollDepthTracked.add(milestone);
        trackEvent('scroll_depth', { depth: milestone });
      }
    });
  };
  
  // Debounce scroll events
  let scrollTimeout: ReturnType<typeof setTimeout>;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(trackScrollDepth, 150);
  }, { passive: true });
}

/**
 * Reset scroll depth tracking (for SPA navigation)
 */
export function resetScrollDepthTracking(): void {
  scrollDepthTracked = new Set();
}

// Time on page tracking state
let pageLoadTime: number | null = null;
let timeOnPageTracked = new Set<number>();

/**
 * Track time on page milestones (5s, 10s, 30s, 60s)
 */
export function initTimeOnPageTracking(): void {
  if (typeof window === 'undefined') return;
  
  pageLoadTime = Date.now();
  const milestones = [5, 10, 30, 60]; // seconds
  
  milestones.forEach(seconds => {
    setTimeout(() => {
      if (!timeOnPageTracked.has(seconds)) {
        timeOnPageTracked.add(seconds);
        trackEvent('time_on_page', { seconds });
      }
    }, seconds * 1000);
  });
}

/**
 * Reset time on page tracking (for SPA navigation)
 */
export function resetTimeOnPageTracking(): void {
  pageLoadTime = null;
  timeOnPageTracked = new Set();
}

/**
 * Track CTA visibility using Intersection Observer
 */
export function trackCtaVisibility(ctaId: string, element: Element): () => void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return () => {};
  }
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          trackEvent('cta_visible', { cta_id: ctaId });
          observer.disconnect();
        }
      });
    },
    { threshold: 0.5 }
  );
  
  observer.observe(element);
  
  return () => observer.disconnect();
}

// ============================================
// Analysis Funnel Tracking
// ============================================

type FunnelStep = 'started' | 'input_complete' | 'processing' | 'completed' | 'exported';

/**
 * Track analysis funnel progression
 */
export function trackAnalysisFunnel(step: FunnelStep, metadata?: Record<string, unknown>): void {
  trackEvent('analysis_funnel', {
    step,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track feature discovery (for onboarding optimization)
 */
export function trackFeatureDiscovery(feature: string, source: string): void {
  trackEvent('feature_discovery', { feature, source });
}

/**
 * Track onboarding step completion
 */
export function trackOnboardingStep(step: number, stepName: string, completed: boolean): void {
  trackEvent('onboarding_step', { step, step_name: stepName, completed });
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt 3 canonical conversion funnel (audit 16-Jun-2026).
// One funnel, six events, defined ONCE here. Every surface that fires a step
// MUST call the helper below — never `trackEvent('idea_submitted', ...)` raw —
// so the funnel can never drift between GA4 and the Supabase sink.
//
// Funnel order:
//   1. idea_submitted        — user hit "Run my free validation"
//   2. analysis_started      — engine kicked off
//   3. analysis_completed    — NORTH-STAR: full verdict returned on their data
//   4. verdict_viewed        — verdict surface rendered (proceed/pivot/kill)
//   5. upgrade_cta_seen      — upgrade CTA shown at a value moment (surface=…)
//   6. subscription_started  — Stripe checkout session created
// ─────────────────────────────────────────────────────────────────────────────

export function trackIdeaSubmitted(idea: string, location?: string): void {
  recordFunnelEvent('idea_submitted', {
    idea_length: idea.length,
    location: location ?? null,
  });
}

export function trackVerdictViewed(verdict: 'proceed' | 'pivot' | 'kill' | string): void {
  recordFunnelEvent('verdict_viewed', { verdict });
}

/**
 * Fire when an upgrade CTA enters the viewport / is rendered.
 * `surface` is the value moment that triggered it — one of:
 *   'pdf_export' | 'location_comparison' | 'document_studio' | 'free_cap_hit'
 *   | 'pricing_page' | 'result_footer'
 */
export function trackUpgradeCtaSeen(
  surface: string,
  fromTier: 'free' | 'plus' | 'pro' | string,
  toTier: 'plus' | 'pro' | string,
): void {
  recordFunnelEvent('upgrade_cta_seen', { surface, from_tier: fromTier, to_tier: toTier });
}

export function trackSubscriptionStarted(
  tier: 'plus' | 'pro' | string,
  billingPeriod: 'monthly' | 'annual' | string = 'monthly',
): void {
  recordFunnelEvent('subscription_started', { tier, billing_period: billingPeriod });
}
