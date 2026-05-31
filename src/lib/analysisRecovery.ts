/**
 * Analysis recovery
 * =================
 * The biggest leak we have today: people submit an analysis, watch the 60–90s
 * progress bar, then close the tab. The server-side analysis completes fine
 * (DB has ~100 successful analyses) but the client never fires
 * `analysis_complete` and the user never sees their report (~18 completes
 * observed → 80%+ leak).
 *
 * This module records the in-progress analysis in `localStorage` the moment
 * the user presses submit. When that user returns to `/` later (even minutes
 * or hours later), `<AnalysisRecoveryBanner>` reads the entry and offers
 * them a one-click link to `/r/:id` so the abandoned report becomes
 * recoverable instead of lost.
 *
 * Entries auto-expire after 7 days so we never resurface stale runs.
 */

const KEY = 'aiwmc_last_analysis_v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface LastAnalysis {
  /** Supabase analyses.id — present once the edge function returned an id */
  id: string | null;
  /** First ~140 chars of the submitted idea, for the recovery banner copy */
  ideaPreview: string;
  /** ms timestamp when the user pressed Submit */
  startedAt: number;
  /** Set to true once the user navigated to /r/:id at least once */
  seen?: boolean;
}

export function saveLastAnalysis(entry: Omit<LastAnalysis, 'startedAt'> & { startedAt?: number }): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: LastAnalysis = {
      id: entry.id,
      ideaPreview: entry.ideaPreview.slice(0, 140),
      startedAt: entry.startedAt ?? Date.now(),
      seen: entry.seen ?? false,
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* localStorage blocked — non-fatal */
  }
}

export function updateLastAnalysisId(id: string): void {
  const cur = readLastAnalysis();
  if (!cur) return;
  saveLastAnalysis({ ...cur, id });
}

export function markLastAnalysisSeen(): void {
  const cur = readLastAnalysis();
  if (!cur) return;
  saveLastAnalysis({ ...cur, seen: true });
}

export function clearLastAnalysis(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function readLastAnalysis(): LastAnalysis | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastAnalysis;
    if (!parsed || typeof parsed.startedAt !== 'number') return null;
    if (Date.now() - parsed.startedAt > TTL_MS) {
      clearLastAnalysis();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
