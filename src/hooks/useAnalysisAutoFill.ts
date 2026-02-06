import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface AnalysisSummary {
  id: string;
  idea: string;
  location: string;
  created_at: string;
  result: {
    business_name?: string;
    industry?: string;
    scenarios?: {
      base?: {
        monthly_revenue?: number;
        year_1_revenue?: number;
        year_2_revenue?: number;
        year_3_revenue?: number;
      };
    };
    financial_metrics?: {
      cac?: number;
      ltv?: number;
      roi?: number;
      payback_period_months?: number;
      startup_investment?: number;
      gross_margin?: number;
    };
    market_data?: {
      tam?: number;
      sam?: number;
      som?: number;
    };
    [key: string]: unknown;
  };
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
  
  // Financial metrics
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
  
  // Market data
  tam?: number;
  sam?: number;
  som?: number;
  
  // Projections
  year_1_revenue?: number;
  year_2_revenue?: number;
  year_3_revenue?: number;
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

  // Map analysis data to template fields
  const mapAnalysisToAutoFill = useCallback((analysis: AnalysisSummary): AutoFillData => {
    const result = analysis.result || {};
    const financialMetrics = result.financial_metrics || {};
    const scenarios = result.scenarios?.base || {};
    const marketData = result.market_data || {};

    const monthlyRevenue = scenarios.monthly_revenue || analysis.monthly_profit || 0;
    
    return {
      // Company info
      company_name: result.business_name || analysis.idea?.split(' ').slice(0, 3).join(' ') || 'Your Business',
      company_city: analysis.location || '',
      industry: result.industry || '',
      
      // Financial metrics
      monthly_revenue: monthlyRevenue,
      quarterly_revenue: monthlyRevenue * 3,
      annual_revenue: monthlyRevenue * 12,
      startup_investment: financialMetrics.startup_investment || analysis.startup_investment || 0,
      monthly_profit: analysis.monthly_profit || 0,
      
      // Unit economics
      cac: financialMetrics.cac || 0,
      ltv: financialMetrics.ltv || 0,
      roi: financialMetrics.roi || 0,
      payback_months: financialMetrics.payback_period_months || analysis.payback_months || 0,
      gross_margin: financialMetrics.gross_margin || 0,
      
      // Market data
      tam: marketData.tam || 0,
      sam: marketData.sam || 0,
      som: marketData.som || 0,
      
      // Projections
      year_1_revenue: scenarios.year_1_revenue || monthlyRevenue * 12,
      year_2_revenue: scenarios.year_2_revenue || monthlyRevenue * 12 * 1.5,
      year_3_revenue: scenarios.year_3_revenue || monthlyRevenue * 12 * 2,
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
