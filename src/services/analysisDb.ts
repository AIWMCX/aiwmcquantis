import { supabase } from '@/integrations/supabase/client';
import type { BusinessAnalysisResult, AnalysisHistoryEntry } from '@/types/analysis';
import { getMonthlyProfit, getPaybackMonths } from '@/types/analysis';
import { secureGetItem, secureRemoveItem } from '@/lib/secureStorage';

const STORAGE_KEY = 'business_analysis_history';

export async function saveAnalysis(
  userId: string,
  idea: string,
  location: string,
  result: BusinessAnalysisResult
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
    } as any)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to save analysis:', error);
    return null;
  }

  return { id: data.id };
}

export async function getAnalyses(userId: string): Promise<AnalysisHistoryEntry[]> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Failed to fetch analyses:', error);
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
    console.error('Failed to delete analysis:', error);
    return false;
  }

  return true;
}

/**
 * Migrate localStorage data to database
 * Handles both encrypted (new) and unencrypted (legacy) data formats
 */
export async function migrateLocalStorageToDb(userId: string): Promise<number> {
  try {
    // Try to get encrypted data first
    let localHistory = await secureGetItem<AnalysisHistoryEntry[]>(STORAGE_KEY);
    
    // If no data found, check for legacy unencrypted data
    if (!localHistory) {
      const legacyStored = localStorage.getItem(STORAGE_KEY);
      if (legacyStored) {
        try {
          const parsed = JSON.parse(legacyStored);
          if (Array.isArray(parsed)) {
            localHistory = parsed;
          }
        } catch {
          // Invalid legacy data
          return 0;
        }
      }
    }

    if (!localHistory || !Array.isArray(localHistory) || localHistory.length === 0) {
      return 0;
    }

    let migrated = 0;
    for (const entry of localHistory) {
      // Validate entry has required fields
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

    // Clear all localStorage data after successful migration
    if (migrated > 0) {
      secureRemoveItem(STORAGE_KEY);
      // Also remove any legacy unencrypted data
      localStorage.removeItem(STORAGE_KEY);
    }

    return migrated;
  } catch (error) {
    console.error('Migration failed:', error);
    return 0;
  }
}
