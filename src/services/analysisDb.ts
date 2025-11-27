import { supabase } from '@/integrations/supabase/client';
import type { BusinessAnalysisResult, AnalysisHistoryEntry } from '@/types/analysis';
import { getMonthlyProfit, getPaybackMonths } from '@/types/analysis';

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

export async function migrateLocalStorageToDb(userId: string): Promise<number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return 0;

    const localHistory: AnalysisHistoryEntry[] = JSON.parse(stored);
    if (!Array.isArray(localHistory) || localHistory.length === 0) return 0;

    let migrated = 0;
    for (const entry of localHistory) {
      const { error } = await supabase
        .from('analyses')
        .insert({
          user_id: userId,
          idea: entry.idea,
          location: entry.location,
          result: entry.result as unknown as Record<string, unknown>,
          confidence_score: entry.result.confidence_score,
          startup_investment: entry.result.financial_analysis.startup_investment.total,
          monthly_profit: getMonthlyProfit(entry.result.financial_analysis),
          payback_months: getPaybackMonths(entry.result.financial_analysis),
          created_at: entry.created_at,
        } as any);

      if (!error) migrated++;
    }

    // Clear localStorage after successful migration
    if (migrated > 0) {
      localStorage.removeItem(STORAGE_KEY);
    }

    return migrated;
  } catch (error) {
    console.error('Migration failed:', error);
    return 0;
  }
}
