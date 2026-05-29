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
 * STRIPE PRICE MAPPING (live mode):
 * - Plus monthly: price_1TKemwLKMhSmZURCw1AwGYX2 (legacy $17 → grandfathered)
 * - Plus annual:  price_1TKenYLKMhSmZURCEqUTfJDM
 * - Pro monthly:  price_1TNnKkLKMhSmZURCWyQTblmg ($41, 14d trial)
 * - Pro annual:   price_1TNnUbLKMhSmZURC3DetuKsA  ($492, NO trial)
 *
 * Trial duration is configured on each Stripe Payment Link in the Dashboard,
 * NOT in this file. Pro Annual must be set to 0 trial days in Stripe.
 */

export const TIERS = {
  free: {
    id: 'free',
    label: 'Free',
    positioning: 'Reconnaissance — is this idea worth your time?',
    priceMonthly: 0,
    priceAnnual: 0,
    limits: {
      analysesPerMonth: 3,
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
      // Tier value-add capabilities (no price change)
      sampleSharingEnabled: true,
      basicEmailDigest: true,
      scenarioComparison: false,
      monthlyBenchmarkRefresh: false,
      customRiskAlerts: false,
      teamWorkspace: false,
      priorityAiQueue: false,
      apiWebhooks: false,
    },
    supportSla: 'best-effort',
    trialEligible: false,
  },
  plus: {
    id: 'plus',
    label: 'Plus',
    positioning: 'Full Analysis — should you actually start this business?',
    priceMonthly: 17,
    priceAnnual: 149,
    priceAnnualMonthlyEquivalent: 12.42,
    limits: {
      analysesPerMonth: Number.POSITIVE_INFINITY,
      downloadsPerDay: Number.POSITIVE_INFINITY,
      projectionMonths: 36,
      monteCarloScenarios: 95_500,
      teamSeats: 1,
      templates: 12,
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
      tamSamSom: false,
      pitchDeck: false,
      strategicRoadmap: false,
      fiveYearModel: false,
      actionPlan: true,
      // Plus value-adds
      sampleSharingEnabled: true,
      basicEmailDigest: true,
      scenarioComparison: true,        // Compare up to 3 saved analyses
      monthlyBenchmarkRefresh: true,   // Auto-rerun when benchmarks update
      customRiskAlerts: true,          // Alert when assumption goes red
      teamWorkspace: false,
      priorityAiQueue: false,
      apiWebhooks: false,
    },
    supportSla: '24h-target',
    trialEligible: { monthly: true, annual: true, days: 14 },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    positioning: 'Investor-Ready — how do you convince investors to fund this?',
    priceMonthly: 49,
    priceAnnual: 469,
    priceAnnualMonthlyEquivalent: 39.08,
    limits: {
      analysesPerMonth: Number.POSITIVE_INFINITY,
      downloadsPerDay: Number.POSITIVE_INFINITY,
      projectionMonths: 60,
      monteCarloScenarios: 95_500,
      teamSeats: 5,
      templates: 12,
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
      // Pro value-adds
      sampleSharingEnabled: true,
      basicEmailDigest: true,
      scenarioComparison: true,
      monthlyBenchmarkRefresh: true,
      customRiskAlerts: true,
      teamWorkspace: true,        // Shared library across all 5 seats
      priorityAiQueue: true,      // Pro runs jump the queue
      apiWebhooks: true,          // Webhook on analysis-complete
    },
    supportSla: '24h-guaranteed',
    trialEligible: { monthly: true, annual: false, days: 14 }, // Pro Annual = NO trial
  },
} as const;

export type TierId = keyof typeof TIERS;
export type FeatureKey = keyof typeof TIERS.pro.features;
export type LimitKey = keyof typeof TIERS.pro.limits;
export type BillingCycle = 'monthly' | 'annual';

/** Stripe price ID → tier mapping. Used by webhook + checkout. */
export const STRIPE_PRICE_TO_TIER: Record<string, { tier: TierId; cycle: BillingCycle; isLegacy?: boolean }> = {
  // Legacy Plus monthly ($17) — grandfathered, still treated as Plus
  price_1TKemwLKMhSmZURCw1AwGYX2: { tier: 'plus', cycle: 'monthly', isLegacy: true },
  // Plus annual
  price_1TKenYLKMhSmZURCEqUTfJDM: { tier: 'plus', cycle: 'annual' },
  // Pro monthly ($41, 14-days trial)
  price_1TNnKkLKMhSmZURCWyQTblmg: { tier: 'pro', cycle: 'monthly' },
  // Pro annual ($492, NO trial)
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
export function resolveTier(sub: { tier?: string | null; status?: string | null } | null | undefined): TierId {
  if (!sub) return 'free';
  if (sub.status !== 'active' && sub.status !== 'trialing') return 'free';
  if (sub.tier === 'plus' || sub.tier === 'pro') return sub.tier;
  return 'free';
}

/** Per-feature upgrade modal copy. Used by <UpgradeModal>. */
export const UPGRADE_COPY: Record<FeatureKey, { title: string; bullets: string[]; recommendedTier: TierId }> = {
  depthQuick: { title: 'Quick Analysis', bullets: [], recommendedTier: 'free' },
  depthFull: {
    title: 'Full Report Mode',
    bullets: ['95,500-scenario Monte Carlo', '36-month P&L with variance bands', 'Prioritized action plan'],
    recommendedTier: 'plus',
  },
  depthPro: {
    title: 'Investor-Grade Analysis',
    bullets: ['60-month (5-year) financial model', 'TAM / SAM / SOM with cited sources', 'Pitch deck data package'],
    recommendedTier: 'pro',
  },
  preMortem: {
    title: 'Pre-Mortem Stress Test',
    bullets: ['Churn shock simulation', 'Cost spike scenarios', 'Customer concentration risk'],
    recommendedTier: 'plus',
  },
  invoiceCapacity: {
    title: 'Invoice & Capacity Check',
    bullets: ['"Should you accept this client?" analysis', 'Cash-flow impact modeling', 'Workload sustainability check'],
    recommendedTier: 'plus',
  },
  documentStudio: {
    title: 'Document Studio',
    bullets: ['12+ branded templates', 'Auto-populated from your analysis', 'PDF + DOCX export'],
    recommendedTier: 'plus',
  },
  aiDocIntelligence: {
    title: 'AI Document Intelligence',
    bullets: ['Extract data from PDF / Excel uploads', 'Auto-fill financial inputs', 'Bank statement parsing'],
    recommendedTier: 'plus',
  },
  customBranding: {
    title: 'Custom Branding',
    bullets: ['Your logo on every export', 'Custom color accents', 'Branded report headers'],
    recommendedTier: 'plus',
  },
  whiteLabel: {
    title: 'White-Label PDF',
    bullets: ['Completely removes Quantis branding', 'Investor-ready output', 'Your firm, your report'],
    recommendedTier: 'pro',
  },
  unlimitedHistory: {
    title: 'Unlimited Analysis History',
    bullets: ['Permanent saved analyses', 'Compare scenarios over time', 'Full audit trail'],
    recommendedTier: 'plus',
  },
  watermarkFree: {
    title: 'Watermark-Free Exports',
    bullets: ['Remove "Powered by AIWMC Quantis" footer', 'Unlimited daily downloads', 'Professional appearance'],
    recommendedTier: 'plus',
  },
  apiAccess: {
    title: 'API Access',
    bullets: ['REST endpoints for all features', 'Programmatic analysis runs', 'Rolling out Q2 2026'],
    recommendedTier: 'pro',
  },
  tamSamSom: {
    title: 'TAM / SAM / SOM Calculator',
    bullets: ['Total / Serviceable / Obtainable market', 'Cited sources from research corpus', 'Investor-ready market sizing'],
    recommendedTier: 'pro',
  },
  pitchDeck: {
    title: 'Pitch Deck Data Package',
    bullets: ['All slide-ready financial figures', 'Exportable to PowerPoint / Keynote', 'Investor-formatted charts'],
    recommendedTier: 'pro',
  },
  strategicRoadmap: {
    title: 'Strategic Roadmap',
    bullets: ['Week-by-week launch plan', 'Milestone tracking', 'Critical-path dependencies'],
    recommendedTier: 'pro',
  },
  fiveYearModel: {
    title: '5-Year Financial Model',
    bullets: ['60-month projection horizon', 'Long-term variance bands', 'Beyond Plus\'s 36-month cap'],
    recommendedTier: 'pro',
  },
  actionPlan: {
    title: 'Action Plan Generator',
    bullets: ['Prioritized next steps', 'Tied to your specific risks', 'Updated per analysis'],
    recommendedTier: 'plus',
  },
  sampleSharingEnabled: {
    title: 'Share Read-Only Analysis Link',
    bullets: ['Send a public link to your analysis', 'No login required for viewers', 'Revoke anytime'],
    recommendedTier: 'free',
  },
  basicEmailDigest: {
    title: 'Weekly Benchmark Digest',
    bullets: ['Your idea vs latest benchmarks', 'Delivered every Monday', 'Unsubscribe anytime'],
    recommendedTier: 'free',
  },
  scenarioComparison: {
    title: 'Scenario Comparison',
    bullets: ['Compare up to 3 saved analyses side-by-side', 'Diff revenue, margin, payback', 'Find the strongest version'],
    recommendedTier: 'plus',
  },
  monthlyBenchmarkRefresh: {
    title: 'Auto Benchmark Refresh',
    bullets: ['Saved analyses re-run when industry data updates', 'See drift over time', 'Stay current automatically'],
    recommendedTier: 'plus',
  },
  customRiskAlerts: {
    title: 'Custom Risk Alerts',
    bullets: ['Email alert when an assumption goes red', 'Tie to LTV:CAC, runway, margin thresholds', 'Catch problems early'],
    recommendedTier: 'plus',
  },
  teamWorkspace: {
    title: 'Team Workspace',
    bullets: ['Shared analysis library across all 5 seats', 'Comment and collaborate', 'Role-based access'],
    recommendedTier: 'pro',
  },
  priorityAiQueue: {
    title: 'Priority AI Queue',
    bullets: ['Pro analyses jump the queue', 'Faster turnaround at peak load', 'Dedicated capacity'],
    recommendedTier: 'pro',
  },
  apiWebhooks: {
    title: 'API Webhooks',
    bullets: ['Webhook fires on analysis-complete', 'Integrate with your stack', 'Pairs with API access'],
    recommendedTier: 'pro',
  },
};
