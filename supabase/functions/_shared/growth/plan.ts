/**
 * Which date ranges each source fetches for a growth-sync run (pure).
 *
 *   daily    -> the last 5 days (UTC, ending today) for GA4 and GSC, one
 *               Clarity call.
 *   backfill -> {from, to} from the body, clipped per source:
 *               GA4 never before 2026-01-01, GSC never before 16 months ago.
 *               Chunked by calendar month. Clarity is skipped (no history).
 *   ping     -> not planned here: growth-sync records one IndexNow ping
 *               summary (_shared/growth/indexnow.ts) and runs nothing else.
 *
 * Phase-2 sources (PSI, indexing, Bing) run in daily mode only: PSI and URL
 * Inspection describe the page as it is now, and every Bing call already
 * returns its whole recent history. Call counts: targets.ts dailyCallBudget().
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

export type SyncMode = 'daily' | 'backfill' | 'ping';
export type PlanMode = Exclude<SyncMode, 'ping'>;

export interface SourcePlan {
  chunks: Array<{ from: string; to: string }>;
  /** Set when the source is skipped for this run. */
  skip?: string;
}

export interface CallPlan {
  call: boolean;
  skip?: string;
}

export interface RunPlan {
  mode: PlanMode;
  ga4: SourcePlan;
  gsc: SourcePlan;
  clarity: CallPlan;
  psi: CallPlan;
  indexing: CallPlan;
  bing: CallPlan;
}

export function parseMode(v: unknown): SyncMode | null {
  return v === 'daily' || v === 'backfill' || v === 'ping' ? v : null;
}

export function planRun(
  mode: PlanMode,
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
      psi: { call: true },
      indexing: { call: true },
      bing: { call: true },
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
    psi: { call: false, skip: 'backfill not supported: PageSpeed Insights measures the page as it is now' },
    indexing: { call: false, skip: 'backfill not supported: sitemaps and URL Inspection report the current state only' },
    bing: { call: false, skip: 'not needed: every daily Bing call returns its whole recent history' },
  };
}
