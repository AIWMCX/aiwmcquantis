import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { BusinessAnalysisResult } from '@/types/analysis';

export interface AnalysisSummary {
  id: string;
  idea: string;
  location: string;
  created_at: string;
  result: Partial<BusinessAnalysisResult>;
  monthly_profit?: number;
  startup_investment?: number;
  payback_months?: number;
  confidence_score?: number;
}

export interface AutoFillData {
  // Common fields
  company_name?: string;
  company_city?: string;
  industry?: string;

  // Financial metrics — resolved from the real financial_analysis paths
  // (see src/lib/canonical-document-mapper.ts's KEY_DEFS for the canonical
  // source-of-truth version of this same resolution).
  monthly_revenue?: number;
  quarterly_revenue?: number;
  annual_revenue?: number;
  startup_investment?: number;
  monthly_profit?: number;

  // Unit economics
  cac?: number;
  ltv?: number;
  roi?: number;
  payback_months?: number;
  gross_margin?: number;

  // Market data — market_size.tam/sam/som are analyst-written prose
  // strings on the real type (e.g. "Local opportunity in Austin, TX"),
  // never numbers. Forms must render these as text, not currency/Number().
  tam?: string;
  sam?: string;
  som?: string;

  // Deliberately no year_1/2/3 revenue projection fields here — the
  // deterministic engine doesn't produce multi-year projections today, and
  // this hook must never fabricate one via a growth multiplier (previous
  // versions did `monthly_revenue * 12 * 1.5` / `* 2`, and downstream forms
  // separately invented their own `* 2.5` / `* 5` / `* 10` on top of that).
  // Forms needing a Year 2/3 figure should leave the field for the user to
  // fill, or wait for real scenario data once /app/scenarios ships.
}

/**
 * Hook for fetching user analyses and auto-filling document templates
 */
export function useAnalysisAutoFill() {
  const { user } = useAuth();
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  // Fetch user's analyses
  const { data: analyses, isLoading, error } = useQuery({
    queryKey: ['user-analyses-for-autofill', user?.id],
    queryFn: async (): Promise<AnalysisSummary[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('analyses')
        .select('id, idea, location, created_at, result, monthly_profit, startup_investment, payback_months, confidence_score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      return (data || []).map(analysis => ({
        ...analysis,
        result: (analysis.result || {}) as AnalysisSummary['result'],
      }));
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Map analysis data to template fields — reads the REAL BusinessAnalysisResult
  // paths (financial_analysis.*, market_analysis.*), matching
  // src/lib/canonical-document-mapper.ts's KEY_DEFS. Never fabricates a
  // value: every field either has a real source or is left undefined so
  // downstream forms' `if (data.field)` guards skip it.
  const mapAnalysisToAutoFill = useCallback((analysis: AnalysisSummary): AutoFillData => {
    const result = analysis.result || {};
    const fa = result.financial_analysis;
    const base = fa?.scenarios?.base;
    const marketSize = result.market_analysis?.market_size;

    const monthlyRevenue = base?.revenue ?? analysis.monthly_profit ?? undefined;

    return {
      // Company info — BusinessAnalysisResult has no business_name field;
      // deriving a display name from the idea text is the only real option.
      company_name: analysis.idea?.split(' ').slice(0, 3).join(' ') || 'Your Business',
      company_city: analysis.location || '',
      industry: result.metadata?.industry_detected || '',

      // Financial metrics — quarterly/annual are legitimate arithmetic
      // conversions of a single real monthly figure, not growth guesses.
      monthly_revenue: monthlyRevenue,
      quarterly_revenue: monthlyRevenue !== undefined ? monthlyRevenue * 3 : undefined,
      annual_revenue: monthlyRevenue !== undefined ? monthlyRevenue * 12 : undefined,
      startup_investment: fa?.startup_investment?.total ?? analysis.startup_investment,
      monthly_profit: analysis.monthly_profit,

      // Unit economics
      cac: fa?.unit_economics?.cac,
      ltv: fa?.unit_economics?.ltv,
      roi: fa?.returns?.roi_year_1,
      payback_months: fa?.returns?.payback_period_months ?? analysis.payback_months,
      gross_margin: base?.gross_margin,

      // Market data — prose strings, not numbers.
      tam: marketSize?.tam,
      sam: marketSize?.sam,
      som: marketSize?.som,
    };
  }, []);

  // Get auto-fill data for selected analysis
  const getAutoFillData = useCallback((analysisId: string): AutoFillData | null => {
    const analysis = analyses?.find(a => a.id === analysisId);
    if (!analysis) {
      toast.error('Analysis not found');
      return null;
    }
    
    setSelectedAnalysisId(analysisId);
    const data = mapAnalysisToAutoFill(analysis);
    toast.success('Fields auto-filled from analysis');
    return data;
  }, [analyses, mapAnalysisToAutoFill]);

  // Get the most recent analysis auto-fill data
  const getMostRecentAutoFill = useCallback((): AutoFillData | null => {
    if (!analyses?.length) {
      toast.error('No analyses found. Create an analysis first.');
      return null;
    }
    
    const mostRecent = analyses[0];
    setSelectedAnalysisId(mostRecent.id);
    const data = mapAnalysisToAutoFill(mostRecent);
    toast.success('Fields auto-filled from your most recent analysis');
    return data;
  }, [analyses, mapAnalysisToAutoFill]);

  return {
    analyses: analyses || [],
    isLoading,
    error,
    selectedAnalysisId,
    getAutoFillData,
    getMostRecentAutoFill,
    hasAnalyses: (analyses?.length || 0) > 0,
  };
}
