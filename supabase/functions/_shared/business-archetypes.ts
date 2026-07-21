/**
 * BUSINESS ARCHETYPES — Single Source of Truth (Deno port)
 * ==========================================================
 * Mirrors src/config/business-archetypes.ts byte-for-byte -- Deno edge
 * functions cannot import from src/. Same dual-port pattern already used
 * for the financial engine (Wave 1/2: contribution-margin.ts /
 * profitability-margins.ts each have a Deno port). Any change to the
 * frontend file must be applied here too.
 *
 * See the frontend file for full design rationale and the scope/honesty
 * note on what this registry does and does not deliver.
 */

export type ArchetypeId =
  | 'subscription_recurring'
  | 'transactional_retail'
  | 'capacity_constrained_service'
  | 'project_based_services'
  | 'contingency_fee'
  | 'transaction_percentage';

export type RevenueShape =
  | 'steady_monthly'
  | 'steady_transactional'
  | 'capacity_capped'
  | 'lumpy_event_triggered'
  | 'volume_percentage';

export type EngineFit = 'good' | 'partial' | 'poor';

export interface BusinessArchetype {
  id: ArchetypeId;
  label: string;
  description: string;
  revenueShape: RevenueShape;
  engineFit: EngineFit;
  engineFitNote: string;
  detectionPhrases: string[];
  examples: string[];
}

// Object key order is the detection precedence order (see detectArchetype
// below) -- monetization-shape archetypes (the 'poor'-fit ones) are listed
// BEFORE the two 'good'-fit ones deliberately. A description can mention
// both a delivery mechanism and a monetization mechanism at once (e.g. "a
// SaaS platform... takes a 25% contingency fee on recovered funds" -- the
// audit's own original motivating example) and the monetization mechanism
// is what actually determines revenue shape, not the delivery mechanism.
// Checking 'poor'-fit phrases first ensures "contingency fee" wins over
// the far weaker, more generic signal "saas" in that same sentence.
export const BUSINESS_ARCHETYPES: Record<ArchetypeId, BusinessArchetype> = {
  contingency_fee: {
    id: 'contingency_fee',
    label: 'Contingency Fee',
    description: 'Revenue arrives only when a specific contingent event happens (a recovery, a win, a realized saving) -- fundamentally event-triggered, not time-based.',
    revenueShape: 'lumpy_event_triggered',
    engineFit: 'poor',
    engineFitNote: 'Confirmed live 2026-07-20 in this account\'s own historical test analyses (e.g. "25% contingency fee on recovered funds") producing a polished MRR-shaped report that doesn\'t match how that business is actually paid.',
    detectionPhrases: ['contingency fee', 'contingency-fee', '% of recovered', 'percent of recovered', 'percentage of recovered', 'take a percentage of recovered', 'take a % of recovered', '% commission on recovered', '% of savings', 'percentage of savings'],
    examples: ['overpayment recovery service', 'legal contingency practice', 'audit-recovery consultancy'],
  },
  project_based_services: {
    id: 'project_based_services',
    label: 'Project-Based Services',
    description: 'Revenue arrives per completed engagement or deliverable, not on a steady monthly cycle -- timing depends on how many projects close in a given month.',
    revenueShape: 'lumpy_event_triggered',
    engineFit: 'poor',
    engineFitNote: 'Does not fit the mrr-shaped engine at all -- project timing and size vary far more than a smooth monthly curve can represent.',
    detectionPhrases: ['per project', 'per-project', 'project-based revenue', 'project-based pricing', 'per case', 'per matter', 'per engagement', 'fixed-fee project', 'fixed fee project'],
    examples: ['construction general contractor', 'law firm billing per case', 'creative agency per campaign'],
  },
  transaction_percentage: {
    id: 'transaction_percentage',
    label: 'Transaction Percentage / Take Rate',
    description: 'Revenue is a percentage cut of underlying transaction volume or value -- depends on transaction size and count, not a per-customer monthly fee.',
    revenueShape: 'volume_percentage',
    engineFit: 'poor',
    engineFitNote: 'The engine has no concept of a take-rate against a separate transaction-volume variable; forcing this through mrr produces a number with no clear real-world referent.',
    detectionPhrases: ['% of transaction', 'percent of transaction', 'percentage of each transaction', '% of each transaction', '% of deal', 'percent of deal', '% of gmv', 'percent of gmv', 'take a cut of each transaction', '% of each sale', 'percentage of each sale'],
    examples: ['two-sided marketplace', 'payment processor', 'affiliate/referral platform'],
  },
  capacity_constrained_service: {
    id: 'capacity_constrained_service',
    label: 'Capacity-Constrained Service',
    description: 'Steady per-transaction revenue like retail, but hard-capped by finite seats, slots, or staff-hours -- revenue cannot grow past that ceiling regardless of demand.',
    revenueShape: 'capacity_capped',
    engineFit: 'poor',
    engineFitNote: 'CODE_VERIFIED 2026-07-21: no capacity-ceiling mechanism exists anywhere in the live engine (confirmed via direct grep of financial-engine.ts and contribution-margin.ts) -- growth-curve scenarios can and do project revenue past what fixed capacity could ever physically deliver. This corrects an earlier diagnostic pass (Q49) that had assumed Wave 1\'s CVP work included a delivery-capacity contract; it does not.',
    detectionPhrases: ['seats available', 'appointment slots', 'studio with', 'chairs', 'stalls', 'max capacity of'],
    examples: ['yoga studio (fixed class sizes)', 'hair salon (fixed chairs)', 'boutique gym'],
  },
  subscription_recurring: {
    id: 'subscription_recurring',
    label: 'Subscription / Recurring',
    description: 'Revenue arrives on a predictable monthly or annual cadence per customer, independent of usage that month.',
    revenueShape: 'steady_monthly',
    engineFit: 'good',
    engineFitNote: 'Directly matches the engine\'s core mrr variable -- this is the shape the engine was built around.',
    detectionPhrases: ['subscription', 'monthly membership', 'recurring revenue', '/mo', 'per month plan', 'saas'],
    examples: ['B2B SaaS tool', 'gym membership', 'subscription box'],
  },
  transactional_retail: {
    id: 'transactional_retail',
    label: 'Transactional / Retail',
    description: 'Revenue arrives as repeated discrete sales at a roughly steady rate -- avg transaction size times transaction count.',
    revenueShape: 'steady_transactional',
    engineFit: 'good',
    engineFitNote: 'Matches the engine\'s avg_check * customers derivation of mrr.',
    detectionPhrases: ['coffee shop', 'retail store', 'e-commerce', 'restaurant', 'per order', 'per transaction average'],
    examples: ['coffee shop', 'e-commerce storefront', 'restaurant'],
  },
};

export const ARCHETYPE_LIST: BusinessArchetype[] = Object.values(BUSINESS_ARCHETYPES);

export function detectArchetype(ideaText: string): BusinessArchetype | null {
  if (!ideaText || typeof ideaText !== 'string') return null;
  const lower = ideaText.toLowerCase();
  for (const archetype of ARCHETYPE_LIST) {
    for (const phrase of archetype.detectionPhrases) {
      if (lower.includes(phrase)) return archetype;
    }
  }
  return null;
}
