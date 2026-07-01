import { MONTE_CARLO_ITERATIONS, DOC_TEMPLATE_COUNT } from './canonical-facts';

/**
 * TIER MATRIX — Single Source of Truth
 * ======================================
 * Authoritative tier configuration for AIWMC Quantis.
 *
 * RULES:
 * 1. NO hardcoded tier strings outside this file.
 * 2. Server entitlement checks (supabase/functions/_shared/entitlements.ts) MUST mirror this.
 * 3. Client `useEntitlements()` reads features from here for UX cosmetics.
 * 4. Real gate is server-side. Client flags are decorative only.
 *
 * STRIPE PRICE MAPPING (live mode) — verified 2026-06-30 directly against
 * Stripe via GetPrices (the previous Plus IDs below were wrong; price_1TKemwLKMhSmZURCw1AwGYX2
 * does not exist in the account at all — corrected here):
 * - Plus monthly: price_1SjnEiLKMhSmZURCONsiueNU ($17)
 * - Plus annual:  price_1SvWTaLKMhSmZURClCoqty4O ($168)
 * - Pro monthly:  price_1TNnKkLKMhSmZURCWyQTblmg ($49)
 * - Pro annual:   price_1TNnUbLKMhSmZURC3DetuKsA ($492)
 *
 * All 4 correspond to env vars in supabase/functions/create-checkout-session
 * (STRIPE_PLUS_PRICE_ID, STRIPE_PLUS_ANNUAL_PRICE_ID, STRIPE_PRO_PRICE_ID,
 * STRIPE_PRO_ANNUAL_PRICE_ID) which must be set in Supabase secrets to these
 * values. Trial (14 days, both plans) is applied per-checkout-session in
 * that function via `subscription_data.trial_period_days`, not on the Price
 * object or a Stripe Payment Link — every "Upgrade to Plus" entry point in
 * the app now routes through create-checkout-session (see useSubscription's
 * createCheckout), not static Payment Links.
 */

export const TIERS = {
  free: {
    id: 'free',
    label: 'Free',
    positioning: 'Reconnaissance — is this idea worth your time?',
    priceMonthly: 0,
    priceAnnual: 0,
    limits: {
      analysesPerMonth: 5,
      downloadsPerDay: 5,
      projectionMonths: 0,
      monteCarloScenarios: 0,
      teamSeats: 0,
      templates: 0, // Doc Studio fully locked for Free (per CTO §2)
    },
    features: {
      depthQuick: true,
      depthFull: false,
      depthPro: false,
      preMortem: false,
      invoiceCapacity: false,
      documentStudio: false,
      aiDocIntelligence: false,
      customBranding: false,
      whiteLabel: false,
      unlimitedHistory: false,
      watermarkFree: false, // Free PDFs ARE watermarked (5/day cap)
      apiAccess: false,
      tamSamSom: false,
      pitchDeck: false,
      strategicRoadmap: false,
      fiveYearModel: false,
      actionPlan: false,
    },
    supportSla: 'best-effort',
    trialEligible: false,
  },
  plus: {
    id: 'plus',
    label: 'Plus',
    positioning: 'Full Analysis — should you actually start this business?',
    priceMonthly: 17,
    priceAnnual: 168,
    priceAnnualMonthlyEquivalent: 14,
    limits: {
      analysesPerMonth: Number.POSITIVE_INFINITY,
      downloadsPerDay: Number.POSITIVE_INFINITY,
      projectionMonths: 36,
      monteCarloScenarios: MONTE_CARLO_ITERATIONS,
      teamSeats: 1,
      templates: DOC_TEMPLATE_COUNT,
    },
    features: {
      depthQuick: true,
      depthFull: true,
      depthPro: false,
      preMortem: true,
      invoiceCapacity: true,
      documentStudio: true,
      aiDocIntelligence: true,
      customBranding: true,
      whiteLabel: false,
      unlimitedHistory: true,
      watermarkFree: true,
      apiAccess: false,
      tamSamSom: true,
      pitchDeck: false,
      strategicRoadmap: false,
      fiveYearModel: false,
      actionPlan: true,
    },
    supportSla: '24h-target',
    trialEligible: { monthly: true, annual: true, days: 14 },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    positioning: 'Investor-Ready — how do you convince investors to fund this?',
    priceMonthly: 49,
    priceAnnual: 492,
    priceAnnualMonthlyEquivalent: 41,
    limits: {
      analysesPerMonth: Number.POSITIVE_INFINITY,
      downloadsPerDay: Number.POSITIVE_INFINITY,
      projectionMonths: 60,
      monteCarloScenarios: MONTE_CARLO_ITERATIONS,
      teamSeats: 3,
      templates: DOC_TEMPLATE_COUNT,
    },
    features: {
      depthQuick: true,
      depthFull: true,
      depthPro: true,
      preMortem: true,
      invoiceCapacity: true,
      documentStudio: true,
      aiDocIntelligence: true,
      customBranding: true,
      whiteLabel: true,
      unlimitedHistory: true,
      watermarkFree: true,
      apiAccess: true, // Schema/keys exist; UI ships in v2 (Q2 2026)
      tamSamSom: true,
      pitchDeck: true,
      strategicRoadmap: true,
      fiveYearModel: true,
      actionPlan: true,
    },
    supportSla: '24h-guaranteed',
    trialEligible: { monthly: true, annual: true, days: 14 },
  },
} as const;

export type TierId = keyof typeof TIERS;
export type FeatureKey = keyof typeof TIERS.pro.features;
export type LimitKey = keyof typeof TIERS.pro.limits;
export type BillingCycle = 'monthly' | 'annual';

/**
 * Stripe price ID → tier mapping. Used by webhook + checkout.
 *
 * Corrected 2026-06-30: this previously listed price_1TKemwLKMhSmZURCw1AwGYX2
 * and price_1TKenYLKMhSmZURCEqUTfJDM for Plus, labeled as a "legacy
 * grandfathered" price. Verified directly against Stripe (GetPrices on
 * prod_ThBb89uyqRxyBa): neither ID exists in the account, and no archived/
 * inactive recurring price exists under any other ID either (the only
 * inactive object on that product is an unrelated one-time price,
 * price_1Skr4GLKMhSmZURCmRN6jvBi). The "legacy grandfathering" scenario had
 * no basis in the real Stripe account — replaced with the real, active IDs.
 */
export const STRIPE_PRICE_TO_TIER: Record<
  string,
  { tier: TierId; cycle: BillingCycle; isLegacy?: boolean }
> = {
  // Plus monthly ($17)
  price_1SjnEiLKMhSmZURCONsiueNU: { tier: 'plus', cycle: 'monthly' },
  // Plus annual ($168)
  price_1SvWTaLKMhSmZURClCoqty4O: { tier: 'plus', cycle: 'annual' },
  // Pro monthly ($49, 14-day trial)
  price_1TNnKkLKMhSmZURCWyQTblmg: { tier: 'pro', cycle: 'monthly' },
  // Pro annual ($492, 14-day trial)
  price_1TNnUbLKMhSmZURC3DetuKsA: { tier: 'pro', cycle: 'annual' },
};

/** Returns whether a (tier, cycle) combination is eligible for a free trial. */
export function isTrialEligible(tier: TierId, cycle: BillingCycle): boolean {
  const eligible = TIERS[tier].trialEligible;
  if (eligible === false) return false;
  if (typeof eligible === 'object') {
    return cycle === 'monthly' ? eligible.monthly : eligible.annual;
  }
  return false;
}

/** Returns the trial duration in days for a (tier, cycle), or 0 if no trial. */
export function getTrialDays(tier: TierId, cycle: BillingCycle): number {
  const eligible = TIERS[tier].trialEligible;
  if (typeof eligible === 'object' && isTrialEligible(tier, cycle)) {
    return eligible.days;
  }
  return 0;
}

/**
 * Resolve a tier from a subscription record.
 * FAIL CLOSED: unknown / inactive → 'free'.
 */
export function resolveTier(
  sub: { tier?: string | null; status?: string | null } | null | undefined
): TierId {
  if (!sub) return 'free';
  if (sub.status !== 'active' && sub.status !== 'trialing') return 'free';
  if (sub.tier === 'plus' || sub.tier === 'pro') return sub.tier;
  return 'free';
}

/** Per-feature upgrade modal copy. Used by <UpgradeModal>. */
export const UPGRADE_COPY: Record<
  FeatureKey,
  { title: string; bullets: string[]; recommendedTier: TierId }
> = {
  depthQuick: { title: 'Quick Analysis', bullets: [], recommendedTier: 'free' },
  depthFull: {
    title: 'Full Report Mode',
    bullets: [
      `${MONTE_CARLO_ITERATIONS.toLocaleString('en-US')}-iteration Monte Carlo across 95,500 benchmarks`,
      '36-month P&L with variance bands',
      'Prioritized action plan',
    ],
    recommendedTier: 'plus',
  },
  depthPro: {
    title: 'Investor-Grade Analysis',
    bullets: [
      '60-month (5-year) financial model',
      'TAM / SAM / SOM with cited sources',
      'Pitch deck data package',
    ],
    recommendedTier: 'pro',
  },
  preMortem: {
    title: 'Pre-Mortem Stress Test',
    bullets: ['Churn shock simulation', 'Cost spike scenarios', 'Customer concentration risk'],
    recommendedTier: 'plus',
  },
  invoiceCapacity: {
    title: 'Invoice & Capacity Check',
    bullets: [
      '"Should you accept this client?" analysis',
      'Cash-flow impact modeling',
      'Workload sustainability check',
    ],
    recommendedTier: 'plus',
  },
  documentStudio: {
    title: 'Document Studio',
    bullets: [`${DOC_TEMPLATE_COUNT} branded templates`, 'Auto-populated from your analysis', 'PDF + DOCX export'],
    recommendedTier: 'plus',
  },
  aiDocIntelligence: {
    title: 'AI Document Intelligence',
    bullets: [
      'Extract data from PDF / Excel uploads',
      'Auto-fill financial inputs',
      'Bank statement parsing',
    ],
    recommendedTier: 'plus',
  },
  customBranding: {
    title: 'Custom Branding',
    bullets: ['Your logo on every export', 'Custom color accents', 'Branded report headers'],
    recommendedTier: 'plus',
  },
  whiteLabel: {
    title: 'White-Label PDF',
    bullets: [
      'Completely removes Quantis branding',
      'Investor-ready output',
      'Your firm, your report',
    ],
    recommendedTier: 'pro',
  },
  unlimitedHistory: {
    title: 'Unlimited Analysis History',
    bullets: ['Permanent saved analyses', 'Compare scenarios over time', 'Full audit trail'],
    recommendedTier: 'plus',
  },
  watermarkFree: {
    title: 'Watermark-Free Exports',
    bullets: [
      'Remove "Powered by AIWMC Quantis" footer',
      'Unlimited daily downloads',
      'Professional appearance',
    ],
    recommendedTier: 'plus',
  },
  apiAccess: {
    title: 'API Access',
    bullets: [
      'REST endpoints for all features',
      'Programmatic analysis runs',
      'Rolling out Q2 2026',
    ],
    recommendedTier: 'pro',
  },
  tamSamSom: {
    title: 'TAM / SAM / SOM Calculator',
    bullets: [
      'Total / Serviceable / Obtainable market',
      'Cited sources from research corpus',
      'Investor-ready market sizing',
    ],
    recommendedTier: 'plus',
  },
  pitchDeck: {
    title: 'Pitch Deck Data Package',
    bullets: [
      'All slide-ready financial figures',
      'Exportable to PowerPoint / Keynote',
      'Investor-formatted charts',
    ],
    recommendedTier: 'pro',
  },
  strategicRoadmap: {
    title: 'Strategic Roadmap',
    bullets: ['Week-by-week launch plan', 'Milestone tracking', 'Critical-path dependencies'],
    recommendedTier: 'pro',
  },
  fiveYearModel: {
    title: '5-Year Financial Model',
    bullets: [
      '60-month projection horizon',
      'Long-term variance bands',
      "Beyond Plus's 36-month cap",
    ],
    recommendedTier: 'pro',
  },
  actionPlan: {
    title: 'Action Plan Generator',
    bullets: ['Prioritized next steps', 'Tied to your specific risks', 'Updated per analysis'],
    recommendedTier: 'plus',
  },
};
