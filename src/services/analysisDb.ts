import { supabase } from '@/integrations/supabase/client';
import type { BusinessAnalysisResult, AnalysisHistoryEntry } from '@/types/analysis';
import { getMonthlyProfit, getPaybackMonths } from '@/types/analysis';
import { secureGetItem, secureRemoveItem } from '@/lib/secureStorage';
import { getAnonymousDeviceId } from '@/lib/anonymousTracking';

import { logger } from '@/lib/logger';
const STORAGE_KEY = 'business_analysis_history';
const ANON_RESULT_PREFIX = 'quantis_anon_result_';
const ANON_RECENT_KEY = 'quantis_anon_recent_id';

export async function saveAnalysis(
  userId: string,
  idea: string,
  location: string,
  result: BusinessAnalysisResult,
  depth: 'quick' | 'full' | 'pro' = 'full'
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('analyses')
    .insert({
      user_id: userId,
      idea,
      location,
      result: result as unknown as Record<string, unknown>,
      confidence_score: result.confidence_score,
      startup_investment: result.financial_analysis.startup_investment.total,
      monthly_profit: getMonthlyProfit(result.financial_analysis),
      payback_months: getPaybackMonths(result.financial_analysis),
      depth,
    } as any)
    .select('id')
    .single();

  if (error) {
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

  const { data, error } = await supabase
    .from('analyses')
    .insert({
      user_id: null,
      anonymous_session_id: sessionId,
      idea,
      location,
      result: result as unknown as Record<string, unknown>,
      confidence_score: result.confidence_score,
      startup_investment: result.financial_analysis.startup_investment.total,
      monthly_profit: getMonthlyProfit(result.financial_analysis),
      payback_months: getPaybackMonths(result.financial_analysis),
      depth,
    } as any)
    .select('id')
    .single();

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
  } catch (e) {
    logger.warn('Failed to cache analysis locally', e);
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
        } as any);

      if (!error) migrated++;
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
