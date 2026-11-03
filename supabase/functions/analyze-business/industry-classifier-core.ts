// Pure keyword-scoring logic extracted from index.ts's detectIndustry() /
// detectIndustryFromDatabase()'s hardcoded-fallback branch (2026-08-30).
// Zero Deno-specific imports so Vitest can import and test it directly --
// same extraction pattern as scripts/invariant-sweep-core.ts and
// status-core.ts (see docs/execution/2026-08-27-canonical-register.md).
//
// Root-caused via two independently reproduced live production bugs
// (2026-08-30), same underlying defect:
//
// 1. A homepage free-analysis request for "A mobile dog-walking and
//    pet-sitting service ... targeting busy professionals" was classified
//    as "Consulting / Professional Services" -- the word "professionals"
//    substring-matched the generic keyword 'professional'.
// 2. A separate request for "A mobile car detailing service ... targeting
//    busy professionals with driveway appointments" was classified as
//    "SaaS / Software" -- "appointments" substring-matched the keyword
//    'app'. This is the same class of bug the SaaS list's own comment
//    ("deliberately excludes cross-industry words like 'subscription',
//    'service', and 'membership'") tried to guard against, but 'app' is a
//    3-letter fragment of dozens of ordinary English words (appointment,
//    apparent, apparatus, appliance, approach...) and raw substring
//    matching could never have been safe for it.
//
// Fixed at the root: matching is now word/phrase-boundary aware (a
// regex with \b anchors) instead of raw String.includes(). This is
// strictly more correct for every existing keyword, including the
// trailing-space hacks the original list used for short fragments ('ai ',
// 'ml ') to dodge matching inside "again" or "train" -- \b handles that
// correctly AND catches cases the trailing-space hack missed (e.g.
// "AI-powered" or "an ML-based tool", where the fragment isn't followed
// by a literal space).

// ─── Rules that run before any keyword scoring (2026-11-03) ───
//
// "HVAC repair company in Phoenix, AZ, 3 technicians" was modeled as
// "General Business" in production: no industry list on the edge had a trade
// in it, and the database list maps 'contractor' to Freelance Services. A
// trade is an unambiguous signal, so it is decided by rule, first, and the
// same words always give the same industry.

export const TRADES_INDUSTRY_ID = 'trades';

/** Whole words or phrases; a plural "s"/"es" is allowed. */
export const TRADE_TERMS = [
  'hvac',
  'heating and cooling',
  'heating and air',
  'air conditioning',
  'furnace repair',
  'plumbing',
  'plumber',
  'electrician',
  'electrical contractor',
  'roofing',
  'roofer',
  'handyman',
  'contractor',
] as const;

// Software or a marketplace *for* trades is not a trade business.
const PRODUCT_FOR_TRADES = /\b(saas|software|app|apps|platform|marketplace|crm|api)\b/i;
// A self-employed "independent contractor" is not a building trade.
const NON_TRADE_CONTRACTOR = /\b(independent|freelance|freelancer|1099)\s+contractors?\b/gi;

/** True when the idea describes a trade / contractor business (HVAC, plumbing, electrical, roofing, handyman, contractor). */
export function isTradesBusiness(idea: string | null | undefined): boolean {
  const text = String(idea ?? '');
  if (!text.trim() || PRODUCT_FOR_TRADES.test(text)) return false;
  const cleaned = text.replace(NON_TRADE_CONTRACTOR, ' ');
  return TRADE_TERMS.some((term) => new RegExp(`\\b${escapeRegExp(term)}(?:s|es)?\\b`, 'i').test(cleaned));
}

// ─── Trade payroll from the stated crew (2026-11-03) ───
//
// "Plumbing repair company in Tucson, AZ, 4 plumbers" showed $5,000/mo
// payroll (the General Business flat default): about one worker's pay for
// four. When the idea states a crew size, payroll is crew × one trade
// worker's monthly wage instead.

/**
 * BLS OEWS May 2023 national median annual wage, plumbers, pipefitters and
 * steamfitters (47-2152): $61,550 → $5,129/month. Electricians (47-2111,
 * $61,590) and HVAC mechanics (49-9021, $57,300) are within 7%. Wages only:
 * employer taxes, insurance and benefits are not added. The location salary
 * multiplier is applied downstream like every other payroll figure.
 */
export const TRADE_WORKER_MONTHLY_WAGE_USD = Math.round(61_550 / 12);
export const TRADE_WAGE_SOURCE = 'BLS OEWS May 2023 median wage, plumbers (47-2152)';

const CREW_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
};
const CREW_ROLES =
  '(?:plumbers?|electricians?|technicians?|techs?|roofers?|installers?|handymen|handyman|workers?|employees?|staff|crew members?|apprentices?|journeymen|journeyman|helpers?|people)';
const CREW_PATTERN = new RegExp(
  `\\b(\\d{1,3}|${Object.keys(CREW_WORDS).join('|')})(?:\\s+(?:full[- ]time|licensed|field|hvac|service|in[- ]house))?\\s+${CREW_ROLES}\\b`,
  'gi',
);
/** Crews above this are not a small-business idea; ignore rather than guess. */
const MAX_STATED_CREW = 200;

/** The crew size the idea states ("4 plumbers", "three technicians"), summed across roles; null when none is stated. */
export function statedTradeCrew(idea: string | null | undefined): number | null {
  const text = String(idea ?? '');
  let total = 0;
  for (const m of text.matchAll(CREW_PATTERN)) {
    const raw = m[1].toLowerCase();
    const n = /^\d+$/.test(raw) ? Number(raw) : CREW_WORDS[raw];
    if (Number.isFinite(n) && n > 0) total += n;
  }
  return total > 0 && total <= MAX_STATED_CREW ? total : null;
}

/** Monthly trade payroll for the stated crew, or null to keep the default. */
export function tradePayrollForIdea(idea: string | null | undefined): number | null {
  const crew = statedTradeCrew(idea);
  return crew == null ? null : crew * TRADE_WORKER_MONTHLY_WAGE_USD;
}

export interface KeywordIndustry {
  id: string;
  name: string;
  keywords: string[];
}

export interface IndustryMatchResult<T extends KeywordIndustry> {
  match: T | null;
  score: number;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Cache compiled patterns across calls -- this runs once per analysis request, but the keyword lists are static. */
const keywordPatternCache = new Map<string, RegExp>();

function keywordPattern(keyword: string): RegExp {
  const trimmed = keyword.trim();
  const cached = keywordPatternCache.get(trimmed);
  if (cached) return cached;
  const pattern = new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, 'i');
  keywordPatternCache.set(trimmed, pattern);
  return pattern;
}

/**
 * Scores every non-general industry by summing the character length of
 * each of its keywords that appears as a whole word/phrase match in the
 * idea text (word-boundary aware, case-insensitive -- NOT a raw substring
 * check, which is what let "appointments" match the keyword 'app' and
 * "professionals" match 'professional' in production). Returns the
 * highest-scoring industry, or null if every industry scored 0 (caller
 * should fall back to a 'general' industry in that case).
 */
export function scoreIndustriesByKeywords<T extends KeywordIndustry>(
  idea: string,
  industries: T[]
): IndustryMatchResult<T> {
  let bestMatch: T | null = null;
  let bestScore = 0;

  for (const industry of industries) {
    if (industry.id === 'general') continue;

    let score = 0;
    for (const keyword of industry.keywords) {
      if (keywordPattern(keyword).test(idea)) {
        score += keyword.trim().length;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = industry;
    }
  }

  return { match: bestMatch, score: bestScore };
}
