/**
 * Anonymous-results localStorage cleanup policy.
 *
 * Anonymous analyses cached on /r/:id are stored under keys prefixed with
 * `quantis_anon_result_<id>`. Without bounds these keys can:
 *   - bloat localStorage (5–10 MB cap → quota errors on subsequent writes)
 *   - confuse users by surfacing month-old results long after relevance
 *
 * Policy:
 *   - TTL: anything older than `MAX_AGE_MS` is dropped
 *   - Cap:  keep at most `MAX_ITEMS` newest entries; evict oldest first
 *
 * Safe to call on every app boot (cheap; iterates only matching keys).
 */

import { logger } from '@/lib/logger';

export const ANON_RESULT_PREFIX = 'quantis_anon_result_';
export const ANON_RECENT_KEY = 'quantis_anon_recent_id';
export const MAX_ITEMS = 10;
export const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

interface CachedShape {
  cached_at?: string;
}

interface Entry {
  key: string;
  ts: number;
}

function readEntries(): Entry[] {
  const out: Entry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(ANON_RESULT_PREFIX)) continue;
      let ts = 0;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as CachedShape;
          if (parsed?.cached_at) ts = new Date(parsed.cached_at).getTime();
        }
      } catch {
        // unparsable → ts stays 0 → will be evicted
      }
      out.push({ key, ts: Number.isFinite(ts) ? ts : 0 });
    }
  } catch (e) {
    logger.warn('anonResultsCleanup: enumerate failed', e);
  }
  return out;
}

/**
 * Sweep expired & overflow entries.
 * Returns count removed (used by tests + observability).
 */
export function sweepAnonymousResults(now: number = Date.now()): number {
  let removed = 0;
  const entries = readEntries();

  // 1) TTL eviction
  const survivors: Entry[] = [];
  for (const e of entries) {
    if (e.ts === 0 || now - e.ts > MAX_AGE_MS) {
      try { localStorage.removeItem(e.key); removed++; } catch { /* noop */ }
    } else {
      survivors.push(e);
    }
  }

  // 2) Cap eviction (newest-first ordering)
  if (survivors.length > MAX_ITEMS) {
    survivors.sort((a, b) => b.ts - a.ts);
    for (const e of survivors.slice(MAX_ITEMS)) {
      try { localStorage.removeItem(e.key); removed++; } catch { /* noop */ }
    }
  }

  // 3) Repair pointer if it dangles
  try {
    const recent = localStorage.getItem(ANON_RECENT_KEY);
    if (recent && !localStorage.getItem(ANON_RESULT_PREFIX + recent)) {
      localStorage.removeItem(ANON_RECENT_KEY);
    }
  } catch { /* noop */ }

  if (removed > 0) {
    logger.info(`anonResultsCleanup: evicted ${removed} entries`);
  }
  return removed;
}

/**
 * Schedule a sweep on idle so it never blocks LCP.
 */
export function scheduleAnonymousResultsSweep(): void {
  const run = () => {
    try { sweepAnonymousResults(); } catch (e) { logger.warn('sweep failed', e); }
  };
  if (typeof window === 'undefined') return;
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (typeof ric === 'function') ric(run);
  else setTimeout(run, 1500);
}
