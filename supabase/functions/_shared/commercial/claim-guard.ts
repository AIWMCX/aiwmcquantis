import { reviewMarketingClaims } from '../marketing-principles.ts';
/**
 * Commercial Ops workflow -- deterministic outbound claim guard.
 *
 * Every piece of text that could reach a prospect (first-touch email,
 * follow-up, prospecting suggested_message) passes through scanOutbound()
 * as the R2 reconcile step of r3Validate. A prompt instruction alone is not
 * enforcement; this is. Purely a function of its inputs -- no LLM, no I/O.
 *
 * Checks:
 *   1. prohibited_claims from the current foundation (case-insensitive)
 *   2. a fixed floor of overclaim / fake-urgency / guarantee patterns that
 *      applies even if the foundation's registry is edited carelessly
 *   3. every "$N" amount must be a price the foundation actually lists
 *   4. no invented social proof ("our clients saw 40%...", "hundreds of
 *      consultants use...") -- Quantis has no customer evidence yet
 *   5. optional word ceiling (first touch must be short)
 */
import type { CommercialFoundation } from './contracts.ts';

export interface OutboundScanResult {
  ok: boolean;
  violations: string[];
}

// `negatable`: an honest negation earlier in the same clause ("does not
// predict success or guarantee an outcome") is not a claim.
const HARD_PATTERNS: Array<{ re: RegExp; label: string; negatable?: boolean }> = [
  { re: /\bguarantee[sd]?\b/gi, label: 'guarantee language', negatable: true },
  { re: /\b\d{2,3}\s?% (accura|confiden|certain)/i, label: 'numeric accuracy/confidence claim' },
  { re: /\baccuracy (score|rate)\b/i, label: 'accuracy score claim' },
  { re: /\b(investor|audit|loan|bank)[- ]grade\b/i, label: '"-grade" quality claim' },
  { re: /\bevery number is (sourced|verified)\b/i, label: '"every number verified" claim' },
  { re: /\b97,?500 (real|verified|actual) (companies|businesses|benchmarks)\b/i, label: '97,500 overclaim' },
  { re: /\b(last chance|act now|only \d+ (spots|seats|places)|limited[- ]time|expires (today|tonight|soon))\b/i, label: 'fake urgency/scarcity' },
  { re: /\b(our|my) (clients|customers|users) (saw|got|achieved|increased|saved|grew)\b/i, label: 'fabricated customer result' },
  { re: /\b(hundreds|thousands|dozens) of (consultants|founders|cfos|firms|customers|users)\b/i, label: 'fabricated adoption claim' },
  { re: /\bpredicts?\b[^.]*\b(success|failure|outcome)/gi, label: 'prediction claim', negatable: true },
];

const NEGATION = /\b(not|never|no|without|cannot|can't|won't|doesn't|don't|isn't)\b|n't\b/i;

function isNegated(text: string, index: number): boolean {
  const before = text.slice(0, index);
  const clauseStart = Math.max(before.lastIndexOf('.'), before.lastIndexOf(';'), before.lastIndexOf('!'), before.lastIndexOf('?'));
  return NEGATION.test(before.slice(clauseStart + 1));
}

function allowedPrices(foundation: CommercialFoundation): Set<number> {
  const out = new Set<number>([0]);
  for (const p of foundation.pricing) {
    for (const k of ['price_monthly', 'price_annual', 'price_one_time']) {
      const v = Number((p as Record<string, unknown>)[k]);
      if (Number.isFinite(v)) out.add(v);
    }
  }
  return out;
}

export function scanOutbound(
  text: string,
  foundation: CommercialFoundation,
  opts: { maxWords?: number } = {},
): OutboundScanResult {
  const violations: string[] = reviewMarketingClaims(text);
  const lower = text.toLowerCase();

  for (const p of foundation.prohibited_claims) {
    const needle = p.trim().toLowerCase();
    if (needle && lower.includes(needle)) violations.push(`prohibited claim: "${p}"`);
  }

  for (const { re, label, negatable } of HARD_PATTERNS) {
    if (!negatable) {
      if (re.test(text)) violations.push(label);
      continue;
    }
    for (const m of text.matchAll(re)) {
      if (!isNegated(text, m.index ?? 0)) {
        violations.push(label);
        break;
      }
    }
  }

  const prices = allowedPrices(foundation);
  for (const m of text.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)(\s?[kK])?/g)) {
    let v = Number(m[1].replace(/,/g, ''));
    if (m[2]) v *= 1000;
    if (!prices.has(v)) violations.push(`price not in foundation: ${m[0].trim()}`);
  }

  if (opts.maxWords) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words > opts.maxWords) violations.push(`too long: ${words} words (max ${opts.maxWords})`);
  }

  return { ok: violations.length === 0, violations };
}

