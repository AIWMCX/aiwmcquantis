/**
 * Quantis Evidence Service — freshness classification (PR E2.1).
 *
 * A simple, deterministic default: compares a source's `publishedAt`
 * against the retrieval time. This is explicitly a STARTING v0 default,
 * not the final design -- master prompt section 33: "Freshness
 * requirements vary by evidence class... Do not implement one global
 * TTL. Create query/evidence-class freshness policies." A future slice
 * should replace the single global threshold set below with per-
 * evidence-class policies (e.g. "current rent" needs a much shorter
 * CURRENT window than "historical regulation"). Until that exists, this
 * is honestly better than the alternative this pipeline shipped with
 * before (`freshness: 'UNKNOWN'` for every source, even ones with a real
 * publish date sitting right there unused).
 */
import type { Freshness } from './types';

const CURRENT_WINDOW_DAYS = 180;
const AGING_WINDOW_DAYS = 730;

export function classifyFreshness(publishedAt: string | undefined, now: Date = new Date()): Freshness {
  if (!publishedAt) return 'UNKNOWN';

  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) return 'UNKNOWN';

  const ageDays = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 0) return 'UNKNOWN'; // A "future" publish date is untrustworthy input, not confidently CURRENT.
  if (ageDays <= CURRENT_WINDOW_DAYS) return 'CURRENT';
  if (ageDays <= AGING_WINDOW_DAYS) return 'AGING';
  return 'HISTORICAL';
}

/** Staleness order, freshest first. UNKNOWN is deliberately excluded from ranking -- it means "no data," not "worse than HISTORICAL." */
const STALENESS_ORDER: Freshness[] = ['CURRENT', 'AGING', 'HISTORICAL'];

/**
 * Rolls up several sources' freshness into one claim-level value: the
 * STALEST classification among sources with a KNOWN freshness (a claim is
 * only as fresh as its least-fresh known-dated source). Sources with
 * UNKNOWN freshness are excluded from the computation rather than
 * dragging the result toward UNKNOWN or toward CURRENT. If every source
 * is UNKNOWN, the rollup is UNKNOWN.
 */
export function rollUpFreshness(freshnesses: Freshness[]): Freshness {
  const known = freshnesses.filter((f): f is Exclude<Freshness, 'UNKNOWN'> => f !== 'UNKNOWN');
  if (known.length === 0) return 'UNKNOWN';

  let staleIndex = 0;
  for (const f of known) {
    staleIndex = Math.max(staleIndex, STALENESS_ORDER.indexOf(f));
  }
  return STALENESS_ORDER[staleIndex];
}
