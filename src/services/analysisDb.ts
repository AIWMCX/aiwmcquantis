import { supabase } from '@/integrations/supabase/client';
import type { BusinessAnalysisResult, AnalysisHistoryEntry } from '@/types/analysis';
import { getMonthlyProfit, getPaybackMonths } from '@/types/analysis';
import { secureGetItem, secureRemoveItem } from '@/lib/secureStorage';
import { getAnonymousDeviceId } from '@/lib/anonymousTracking';
import {
  ANON_RESULT_PREFIX,
  ANON_RECENT_KEY,
  sweepAnonymousResults,
} from '@/lib/anonResultsCleanup';

import { logger } from '@/lib/logger';
const STORAGE_KEY = 'business_analysis_history';

/** Postgres unique_violation — the idempotency index rejected a duplicate. */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * Deterministic idempotency key for an analysis save.
 *
 * The same completed analysis can be persisted more than once — React Query's
 * onSuccess, the Pro-job settle handler, a StrictMode double-invoke, or a
 * localStorage migration that overlaps a live save. Each of those carries the
 * SAME result object, so a content-derived key collides and the unique index
 * `analyses_idempotency_key_uidx` rejects the second write. A genuinely new
 * run produces different numbers (and computed_at), so it gets a fresh key and
 * is correctly saved as a separate history entry.
 *
 * djb2 over the salient fields — cheap, stable, and short enough for the
 * text column. Includes the owner scope so two users can run identical ideas.
 */
function computeIdempotencyKey(
  scope: string,
  idea: string,
  location: string,
  result: BusinessAnalysisResult,
): string {
  const fingerprint = [
    scope,
    idea.trim().toLowerCase(),
    location.trim().toLowerCase(),
    result.confidence_score ?? '',
    getMonthlyProfit(result.financial_analysis) ?? '',
    getPaybackMonths(result.financial_analysis) ?? '',
    result.financial_analysis?.startup_investment?.total ?? '',
    // distinguishes re-runs of the same inputs that produced different math
    (result as unknown as { computed_at?: string; generated_at?: string }).computed_at ??
      (result as unknown as { generated_at?: string }).generated_at ??
      '',
  ].join('|');
  let h = 5381;
  for (let i = 0; i < fingerprint.length; i++) {
    h = ((h << 5) + h + fingerprint.charCodeAt(i)) | 0;
  }
  return `a_${scope}_${(h >>> 0).toString(36)}`;
}

export async function saveAnalysis(
  userId: string,
  idea: string,
  location: string,
  result: BusinessAnalysisResult,
  depth: 'quick' | 'full' | 'pro' = 'full'
): Promise<{ id: string } | null> {
  const idempotencyKey = computeIdempotencyKey(userId, idea, location, result);

  const { data, error } = await supabase
    .from('analyses')
    .insert({
      user_id: userId,
      idea,
      location,
      result: result as unknown as Record<string, unknown>,
      confidence_score: result.confidence_score,
      startup_investment: result.financial_analysis?.startup_investment?.total ?? 0,
      monthly_profit: getMonthlyProfit(result.financial_analysis),
      payback_months: getPaybackMonths(result.financial_analysis),
      depth,
      idempotency_key: idempotencyKey,
      // Handbook §19 item 9 follow-up — joins to analysis_snapshots.correlation_id
      // without ever mutating the immutable snapshot row.
      analysis_correlation_id: result.analysis_correlation_id ?? null,
      // Phase D (2026-08-01) — frozen calculateStrictFinancials input bundle,
      // attached server-side by analyze-business/index.ts. Enables scenario
      // modeling without re-running industry/location detection later (see
      // migration 20260801030858_scenario_base_input_and_quota_rpc.sql).
      // Absent (undefined) only for legacy result shapes.
      scenario_base_input: (result as unknown as { _scenarioBaseInput?: unknown })._scenarioBaseInput ?? null,
    } as any)
    .select('id')
    .single();

  if (error) {
    // Duplicate save of the same completion — return the row that won the race
    // so the caller still gets a valid id (idempotent, not an error).
    if (error.code === PG_UNIQUE_VIOLATION) {
      const { data: existing } = await supabase
        .from('analyses')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) {
        logger.info('saveAnalysis deduped via idempotency_key', {
          metadata: { idempotency_key: idempotencyKey },
        });
        return { id: existing.id };
      }
    }
    logger.error('Failed to save analysis:', error);
    return null;
  }

  return { id: data.id };
}

/**
 * Persist an anonymous analysis to the database with anonymous_session_id
 * so the visitor can later claim it after signing up. Also caches the full
 * result in localStorage keyed by id, which is the source of truth for the
 * public /r/:id result page when the visitor is unauthenticated (RLS would
 * otherwise hide the row from them).
 */
export async function saveAnonymousAnalysis(
  idea: string,
  location: string,
  result: BusinessAnalysisResult,
  depth: 'quick' | 'full' | 'pro' = 'full',
): Promise<{ id: string } | null> {
  const sessionId = getAnonymousDeviceId();
  const idempotencyKey = computeIdempotencyKey(sessionId, idea, location, result);

  // Wrap the entire insert (including object construction) so that any
  // malformed `result` shape — e.g. a degraded/deterministic-fallback
  // analysis missing financial_analysis — falls back to a local-only id
  // instead of throwing and silently breaking the post-analysis redirect.
  try {
    const { data, error } = await supabase
      .from('analyses')
      .insert({
        user_id: null,
        anonymous_session_id: sessionId,
        idea,
        location,
        result: result as unknown as Record<string, unknown>,
        confidence_score: result.confidence_score,
        startup_investment: result.financial_analysis?.startup_investment?.total ?? 0,
        monthly_profit: getMonthlyProfit(result.financial_analysis),
        payback_months: getPaybackMonths(result.financial_analysis),
        depth,
        idempotency_key: idempotencyKey,
        // Preserve the frozen deterministic input so that a guest who creates
        // an account can immediately use the included Scenario Lab against
        // this exact Decision Run after it is claimed.
        scenario_base_input: (result as unknown as { _scenarioBaseInput?: unknown })._scenarioBaseInput ?? null,
      } as any)
      .select('id')
      .single();

    // Duplicate anonymous save — recover the row that won the race.
    if (error?.code === PG_UNIQUE_VIOLATION) {
      const { data: existing } = await supabase
        .from('analyses')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) {
        cacheAnalysisLocally(existing.id, { idea, location, result });
        return { id: existing.id };
      }
    }

    if (error || !data) {
      // DB write failed — fall back to a synthetic id and cache locally so the
      // result page still works for the visitor.
      logger.warn('Anonymous analysis DB save failed, using local-only id:', error?.message);
      const localId = crypto.randomUUID();
      cacheAnalysisLocally(localId, { idea, location, result });
      return { id: localId };
    }

    cacheAnalysisLocally(data.id, { idea, location, result });
    return { id: data.id };
  } catch (err) {
    logger.warn('Anonymous analysis save threw, using local-only id:', err instanceof Error ? err.message : err);
    const localId = crypto.randomUUID();
    cacheAnalysisLocally(localId, { idea, location, result });
    return { id: localId };
  }
}

interface CachedAnalysis {
  idea: string;
  location: string;
  result: BusinessAnalysisResult;
  cached_at: string;
}

export function cacheAnalysisLocally(
  id: string,
  payload: { idea: string; location: string; result: BusinessAnalysisResult },
): void {
  try {
    const cached: CachedAnalysis = { ...payload, cached_at: new Date().toISOString() };
    localStorage.setItem(ANON_RESULT_PREFIX + id, JSON.stringify(cached));
    localStorage.setItem(ANON_RECENT_KEY, id);
    // Enforce TTL + cap so /r/:id cache never bloats storage.
    sweepAnonymousResults();
  } catch (e) {
    logger.warn('Failed to cache analysis locally', e);
    // Quota likely full — sweep aggressively then surface failure upstream.
    try { sweepAnonymousResults(); } catch { /* noop */ }
  }
}

export function getCachedAnalysis(id: string): CachedAnalysis | null {
  try {
    const raw = localStorage.getItem(ANON_RESULT_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as CachedAnalysis;
  } catch {
    return null;
  }
}

export function getMostRecentCachedId(): string | null {
  try {
    return localStorage.getItem(ANON_RECENT_KEY);
  } catch {
    return null;
  }
}

/**
 * Try DB first (works for owner/public analyses), then fall back to local cache
 * (for anonymous visitors who just ran an analysis on this device).
 */
export async function fetchAnalysisForView(
  id: string,
): Promise<{ idea: string; location: string; result: BusinessAnalysisResult; source: 'db' | 'cache' } | null> {
  const { data } = await supabase
    .from('analyses')
    .select('idea, location, result')
    .eq('id', id)
    .maybeSingle();

  if (data) {
    return {
      idea: data.idea,
      location: data.location,
      result: data.result as unknown as BusinessAnalysisResult,
      source: 'db',
    };
  }

  const local = getCachedAnalysis(id);
  if (local) {
    return { idea: local.idea, location: local.location, result: local.result, source: 'cache' };
  }
  return null;
}

export const HISTORY_PAGE_SIZE = 25;

export async function getAnalyses(
  userId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<AnalysisHistoryEntry[]> {
  const limit = opts.limit ?? HISTORY_PAGE_SIZE;
  let query = supabase
    .from('analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts.before) {
    query = query.lt('created_at', opts.before);
  }
  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch analyses:', error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    idea: row.idea,
    location: row.location,
    result: row.result as unknown as BusinessAnalysisResult,
    created_at: row.created_at,
  }));
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('analyses')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('Failed to delete analysis:', error);
    return false;
  }

  return true;
}

/**
 * Migrate localStorage data to database
 */
export async function migrateLocalStorageToDb(userId: string): Promise<number> {
  try {
    let localHistory = await secureGetItem<AnalysisHistoryEntry[]>(STORAGE_KEY);

    if (!localHistory) {
      const legacyStored = localStorage.getItem(STORAGE_KEY);
      if (legacyStored) {
        try {
          const parsed = JSON.parse(legacyStored);
          if (Array.isArray(parsed)) {
            localHistory = parsed;
          }
        } catch {
          return 0;
        }
      }
    }

    if (!localHistory || !Array.isArray(localHistory) || localHistory.length === 0) {
      return 0;
    }

    let migrated = 0;
    for (const entry of localHistory) {
      if (!entry.idea || !entry.location || !entry.result) {
        continue;
      }

      const { error } = await supabase
        .from('analyses')
        .insert({
          user_id: userId,
          idea: entry.idea,
          location: entry.location,
          result: entry.result as unknown as Record<string, unknown>,
          confidence_score: entry.result.confidence_score,
          startup_investment: entry.result.financial_analysis?.startup_investment?.total,
          monthly_profit: getMonthlyProfit(entry.result.financial_analysis),
          payback_months: getPaybackMonths(entry.result.financial_analysis),
          created_at: entry.created_at,
          idempotency_key: computeIdempotencyKey(userId, entry.idea, entry.location, entry.result),
        } as any);

      // A unique-violation means this localStorage entry was already migrated
      // (or saved live) — count it as migrated so it still clears local state.
      if (!error || error.code === PG_UNIQUE_VIOLATION) migrated++;
    }

    if (migrated > 0) {
      secureRemoveItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    }

    return migrated;
  } catch (error) {
    logger.error('Migration failed:', error);
    return 0;
  }
}
