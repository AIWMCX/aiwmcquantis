/**
 * BUSINESS ARCHETYPES — Single Source of Truth
 * =============================================
 * Domain 5 audit (Q41/Q44/Q45/Q165/Q179, 2026-07-16 + 2026-07-20/21
 * profitability audits): AIWMC Quantis has never classified businesses by
 * *operating archetype* (how revenue actually arrives) as a concept
 * distinct from *industry* (what sector, e.g. "SaaS", "Coffee Shop" --
 * see `result.metadata.industry_detected`). This file is the canonical
 * registry for that missing axis.
 *
 * RULE: mirrored byte-for-byte in
 * `supabase/functions/_shared/business-archetypes.ts` (Deno cannot import
 * from `src/`). Any change here must be applied there too -- this is the
 * same dual-port pattern already used for the financial engine (Wave 1/2:
 * contribution-margin.ts / profitability-margins.ts each have a Deno
 * port). A drift test should compare the two if this registry grows.
 *
 * SCOPE AND HONESTY NOTE: this registry classifies and WARNS. It does not
 * (yet) route different archetypes through different calculation paths --
 * that is a materially larger project (a true per-archetype formula
 * engine) that this file explicitly does not claim to deliver. What it
 * closes: the engine currently computes every business through one `mrr`
 * variable shaped as steady monthly transactions (see
 * `financial-engine.ts`), silently producing a polished, confident-looking
 * report even when that shape doesn't match how the business is paid.
 * This registry is the classification layer a fuller fix would build on.
 */

export type ArchetypeId =
  | 'subscription_recurring'
  | 'transactional_retail'
  | 'capacity_constrained_service'
  | 'project_based_services'
  | 'contingency_fee'
  | 'transaction_percentage';

export type RevenueShape =
  | 'steady_monthly'      // recurring membership/subscription cadence
  | 'steady_transactional' // repeated unit sales, avg_check * customers
  | 'capacity_capped'      // steady transactional, but capped by fixed seats/slots
  | 'lumpy_event_triggered' // paid on discrete wins/completions, not a monthly cycle
  | 'volume_percentage';   // a cut of underlying transaction volume/value

export type EngineFit = 'good' | 'partial' | 'poor';

export interface BusinessArchetype {
  id: ArchetypeId;
  label: string;
  description: string;
  revenueShape: RevenueShape;
  /** Whether financial-engine.ts's single mrr-shaped model fits this archetype. */
  engineFit: EngineFit;
  engineFitNote: string;
  /**
   * Unambiguous phrases that mark this archetype with high precision.
   * Design bias: precision over recall -- an ambiguous idea should stay
   * unclassified rather than risk a false positive. Matched lowercase,
   * substring, against the free-text idea.
   */
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

/**
 * Detect the clearest archetype match on a free-text business idea.
 * Returns null if no unambiguous match is found -- callers should treat
 * null as "unclassified", not as a default archetype. High precision by
 * design (see file docblock); ambiguous ideas are deliberately left
 * unclassified rather than risk a false positive.
 */
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
