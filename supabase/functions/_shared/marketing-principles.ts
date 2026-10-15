/** Shared marketing direction. Applies to drafts, never to financial calculations. */
export const MARKETING_POLICY_VERSION = '2026-10-15.1';

export const MARKETING_PRINCIPLES = [
  ['scarcity', 'Use only documented delivery capacity or an approved campaign with a fixed end timestamp and timezone. Never reset a deadline or invent remaining places.'],
  ['social_proof', 'Use attributable, permissioned customer evidence with its source and date. No invented ratings, review totals, logos or customer outcomes.'],
  ['fomo', 'Show actual work in progress, published demos and permissioned participation. Label fictional cases. Do not imply a crowd or event that does not exist.'],
  ['anchoring', 'Compare genuine current offers with clear scope. Never invent an original price, inflated alternative cost or a mandatory expensive-first ordering.'],
  ['charm_pricing', 'Pricing presentation is an experiment, not authority to change prices. Read canonical prices and billing terms; never invent $199 or $2000 offers.'],
  ['loss_aversion', 'Explain a concrete decision risk using client inputs or a labeled illustrative scenario. Include assumptions and uncertainty; no fear coercion or universal twice-as-powerful claim.'],
  ['free_effect', 'Give a useful free first result with clear boundaries and an honest next step. Do not change free entitlements or require payment for an advertised free resource.'],
  ['reciprocity', 'Teach one useful concept or provide a real sample before a proportionate ask. A gift creates no obligation to buy.'],
  ['decoy_effect', 'Use an honest comparison of existing Free, Plus and Pro value. Do not create a deliberately useless plan or fake discount to force a choice.'],
  ['choice_clarity', 'One audience, one problem, one main offer and one primary CTA per creative. Keep access to full pricing and terms.'],
  ['halo_effect', 'Polish the first touchpoint: approved logo, navy/electric blue/white, readable type, responsive layout and a working demo. Beauty never substitutes for financial correctness.'],
  ['framing', 'Show full billed price and cadence prominently. Any per-day equivalent must state its divisor and be labeled approximate; $1999/month is not exactly $66/day.'],
  ['mere_exposure', 'Repeat the positioning through varied useful examples. Respect suppression, frequency, deduplication and existing publishing approval. Daily visibility is not permission to spam.'],
  ['commitment', 'Ask for a small useful step: inspect the worked example or identify one assumption. Never claim a two-minute completion time without evidence.'],
  ['endowment', 'Let users explore and save their own scenario within existing entitlements. Preserve work and explain trial expiry; never threaten deletion to pressure purchase.'],
  ['bandwagon', 'Show verified, permissioned participation when it exists. Directory listings are not customers; founder tests, grants and demo sessions are not paid adoption.'],
] as const;

export const MARKETING_SYSTEM_PROMPT = [
  `AIWMC Quantis marketing policy ${MARKETING_POLICY_VERSION}.`,
  'Purpose: help an independent advisor evaluate one real client decision. Teach the mechanism, show supported evidence, and invite one useful next step.',
  'These are hypotheses for clear communication, not guaranteed psychological laws or measured conversion lifts. Select at most two relevant principles for a draft; never stack all of them.',
  ...MARKETING_PRINCIPLES.map(([name, rule]) => `${name}: ${rule}`),
  'No approved seasonal promotion or review-statistics feed is wired into these generators. Do not announce a Diwali sale, countdown, rating or review count. A requested campaign name is not proof of its terms.',
  'Prefer a worked decision, visible assumptions, a useful free example and one CTA now. Existing canonical prices, offer scopes, claim guards and human approval continue to apply.',
].join('\n');

/** Narrow deterministic draft checks, not a comprehensive semantic verifier.
 * No trusted campaign/proof registry exists in this integration. These claim
 * classes therefore require a separate evidence-reviewed workflow; client
 * briefs and LLM outputs cannot self-authorize them.
 */
export function reviewMarketingClaims(text: string): string[] {
  const rules: Array<[RegExp, string]> = [
    [/\b(?:ends?|expires?)\s+(?:tonight|today|in\s+\d+\s+(?:hours?|minutes?))\b|\b(?:last chance|only\s+\d+\s+(?:spots?|seats?|places?)\s+left)\b|только сегодня|последний шанс|осталось\s+\d+\s+мест/iu, 'deadline_or_capacity_evidence_required'],
    [/\bdiwali\s+(?:sale|deal|discount|offer)\b|\b(?:sale|deal|discount|offer)\s+(?:for\s+)?diwali\b/iu, 'approved_campaign_required'],
    [/\b\d(?:\.\d+)?\s*(?:\/\s*5\s*(?:stars?)?|stars?\b)|\b(?:rated|rating(?:\s+of)?)\s+\d(?:\.\d+)?\b/iu, 'rating_evidence_required'],
    [/\b(?:\d[\d,.]*\s*[kK]?|ten thousand|thousands of|hundreds of)\s+(?:verified\s+)?(?:reviews?|paying customers?|happy customers?)\b|\d[\d\s,.]*\s+отзыв/iu, 'customer_proof_required'],
  ];
  return rules.filter(([pattern]) => pattern.test(text)).map(([, reason]) => reason);
}
