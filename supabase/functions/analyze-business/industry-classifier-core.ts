// Pure keyword-scoring logic extracted from index.ts's detectIndustry() /
// detectIndustryFromDatabase()'s hardcoded-fallback branch (2026-08-30).
// Zero Deno-specific imports so Vitest can import and test it directly --
// same extraction pattern as scripts/invariant-sweep-core.ts and
// status-core.ts (see docs/execution/2026-08-27-canonical-register.md).
//
// Root-caused via a live production bug: a homepage free-analysis request
// for "A mobile dog-walking and pet-sitting service ... targeting busy
// professionals" was classified as "Consulting / Professional Services" --
// the word "professionals" substring-matched the generic keyword
// 'professional' in the consulting industry's keyword list, scoring higher
// than every other industry (all of which scored 0, since none has a
// dog-walking/pet-care category). This function is deliberately minimal so
// the exact scoring behavior (substring .includes(), score += keyword
// length, highest score wins, ties keep the first-seen industry) is
// unit-testable in isolation from the 4000+ line edge function file it was
// extracted from.

export interface KeywordIndustry {
  id: string;
  name: string;
  keywords: string[];
}

export interface IndustryMatchResult<T extends KeywordIndustry> {
  match: T | null;
  score: number;
}

/**
 * Scores every non-general industry by summing the character length of
 * each of its keywords that appears as a substring of `ideaLower`
 * (case-insensitive; caller is expected to have already lowercased
 * `ideaLower`, matching the original inline implementation). Returns the
 * highest-scoring industry, or null if every industry scored 0 (caller
 * should fall back to a 'general' industry in that case).
 */
export function scoreIndustriesByKeywords<T extends KeywordIndustry>(
  idea: string,
  industries: T[]
): IndustryMatchResult<T> {
  // Lowercased internally rather than trusted from the caller -- the
  // original inline implementation relied on every call site having
  // already lowercased its input, an easy-to-violate precondition for an
  // exported, independently-testable function.
  const ideaLower = idea.toLowerCase();
  let bestMatch: T | null = null;
  let bestScore = 0;

  for (const industry of industries) {
    if (industry.id === 'general') continue;

    let score = 0;
    for (const keyword of industry.keywords) {
      if (ideaLower.includes(keyword.toLowerCase())) {
        score += keyword.length;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = industry;
    }
  }

  return { match: bestMatch, score: bestScore };
}
