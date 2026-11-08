/**
 * Which date ranges each source fetches for a growth-sync run (pure).
 *
 *   daily    -> the last 5 days (UTC, ending today) for GA4 and GSC, one
 *               Clarity call.
 *   backfill -> {from, to} from the body, clipped per source:
 *               GA4 never before 2026-01-01, GSC never before 16 months ago.
 *               Chunked by calendar month. Clarity is skipped (no history).
 */
import {
  GA4_DEFAULT_FROM,
  dailyWindow,
  gscDefaultFrom,
  isIsoDay,
  maxDay,
  minDay,
  monthChunks,
} from './dates.ts';

export type SyncMode = 'daily' | 'backfill';

export interface SourcePlan {
  chunks: Array<{ from: string; to: string }>;
  /** Set when the source is skipped for this run. */
  skip?: string;
}

export interface RunPlan {
  mode: SyncMode;
  ga4: SourcePlan;
  gsc: SourcePlan;
  clarity: { call: boolean; skip?: string };
}

export function parseMode(v: unknown): SyncMode | null {
  return v === 'daily' || v === 'backfill' ? v : null;
}

export function planRun(
  mode: SyncMode,
  today: string,
  body: { from?: unknown; to?: unknown } = {},
): RunPlan {
  if (mode === 'daily') {
    const w = dailyWindow(today);
    return {
      mode,
      ga4: { chunks: [w] },
      gsc: { chunks: [w] },
      clarity: { call: true },
    };
  }

  const ga4Floor = GA4_DEFAULT_FROM;
  const gscFloor = gscDefaultFrom(today);
  const to = isIsoDay(body.to) ? minDay(body.to, today) : today;
  const reqFrom = isIsoDay(body.from) ? body.from : null;

  const clip = (floor: string): SourcePlan => {
    const from = reqFrom ? maxDay(reqFrom, floor) : floor;
    if (from > to) return { chunks: [], skip: `outside source range (earliest ${floor})` };
    return { chunks: monthChunks(from, to) };
  };

  return {
    mode,
    ga4: clip(ga4Floor),
    gsc: clip(gscFloor),
    clarity: { call: false, skip: 'backfill not supported: the Clarity API only covers the last 1-3 days' },
  };
}
