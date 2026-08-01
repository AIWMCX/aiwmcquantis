import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { BusinessAnalysisResult } from '@/types/analysis';
import type { CanonicalModelSnapshot, DocumentVariable } from '@/types/canonical-document-model';
import { mapCanonicalModelToDocumentVariables } from '@/lib/canonical-document-mapper';

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

interface SnapshotRow {
  id: number;
  analysis_id: string;
  engine_version: string;
  formula_registry_version: string;
  dataset_version: string;
  numeric_output_hash: string;
  created_at: string;
}

export interface AutoFillData {
  // Common fields
  company_name?: string;
  company_city?: string;
  industry?: string;

  // Financial metrics — resolved via mapCanonicalModelToDocumentVariables(),
  // the same single source of truth Docs Studio's canonical mapper uses, so
  // this hook can never drift from it into its own "what does mrr mean".
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
  // this hook must never fabricate one via a growth multiplier. Forms
  // needing a Year 2/3 figure leave it for the user to fill, or wait for
  // real scenario data once /app/scenarios ships.
}

/** Build the canonical snapshot input for one analysis, using its latest
 * analysis_snapshots row for provenance when one exists. Analyses created
 * before the snapshot pipeline existed (or before the 2026-07-29
 * scenarioContradictions crash fix restored snapshot writing) fall back to
 * placeholder version/hash strings — auto-fill still works off the real
 * result, it just can't claim a real snapshot lineage for that document. */
function toCanonicalSnapshot(
  analysis: AnalysisSummary,
  snapshot: SnapshotRow | undefined,
): CanonicalModelSnapshot {
  return {
    snapshotId: snapshot ? String(snapshot.id) : 'unsnapshotted',
    analysisId: analysis.id,
    engineVersion: snapshot?.engine_version ?? 'unknown',
    formulaVersion: snapshot?.formula_registry_version ?? 'unknown',
    datasetVersion: snapshot?.dataset_version ?? 'unknown',
    numericOutputHash: snapshot?.numeric_output_hash ?? 'unavailable',
    result: analysis.result as BusinessAnalysisResult,
  };
}

/** Reduce the canonical mapper's full provenance-carrying output down to
 * the plain scalar shape the existing document forms consume. Company/
 * location/industry aren't part of the canonical mapper's registry (it
 * only covers financial_analysis/market_analysis paths), so those are
 * still resolved directly here. */
function toAutoFillData(
  analysis: AnalysisSummary,
  variables: Record<string, DocumentVariable>,
): AutoFillData {
  const num = (key: string): number | undefined => {
    const v = variables[key]?.renderedValue;
    return typeof v === 'number' ? v : undefined;
  };
  const str = (key: string): string | undefined => {
    const v = variables[key]?.renderedValue;
    return typeof v === 'string' ? v : undefined;
  };

  const monthlyRevenue = num('baseRevenue') ?? analysis.monthly_profit ?? undefined;

  return {
    // BusinessAnalysisResult has no business_name field; deriving a
    // display name from the idea text is the only real option.
    company_name: analysis.idea?.split(' ').slice(0, 3).join(' ') || 'Your Business',
    company_city: analysis.location || '',
    industry: variables.industryDetected ? str('industryDetected') || '' : '',

    // Quarterly/annual are legitimate arithmetic conversions of one real
    // monthly figure, not growth guesses.
    monthly_revenue: monthlyRevenue,
    quarterly_revenue: monthlyRevenue !== undefined ? monthlyRevenue * 3 : undefined,
    annual_revenue: monthlyRevenue !== undefined ? monthlyRevenue * 12 : undefined,
    startup_investment: num('startupInvestmentTotal') ?? analysis.startup_investment,
    monthly_profit: analysis.monthly_profit,

    cac: num('cac'),
    ltv: num('ltv'),
    roi: num('roiYear1'),
    payback_months: num('investmentPaybackMonths') ?? analysis.payback_months,
    gross_margin: num('baseGrossMargin'),

    tam: str('tam'),
    sam: str('sam'),
    som: str('som'),
  };
}

/**
 * Hook for fetching user analyses and auto-filling document templates.
 * Value resolution is delegated entirely to
 * mapCanonicalModelToDocumentVariables() — this hook only adapts that
 * output into the scalar AutoFillData shape forms already consume, and
 * exposes the full provenance-carrying variables via getCanonicalVariables()
 * for callers that persist a document's lineage (snapshot ID, hash,
 * engine/formula version) rather than just its values.
 */
export function useAnalysisAutoFill() {
  const { user } = useAuth();
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

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
    staleTime: 5 * 60 * 1000,
  });

  // Latest analysis_snapshots row per analysis, fetched in one batch query
  // for the whole list rather than N+1 per-analysis round trips.
  const analysisIds = (analyses ?? []).map((a) => a.id);
  const { data: snapshotsByAnalysisId } = useQuery({
    queryKey: ['analysis-snapshots-for-autofill', analysisIds],
    queryFn: async (): Promise<Map<string, SnapshotRow>> => {
      if (analysisIds.length === 0) return new Map();

      const { data, error } = await supabase
        .from('analysis_snapshots')
        .select('id, analysis_id, engine_version, formula_registry_version, dataset_version, numeric_output_hash, created_at')
        .in('analysis_id', analysisIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const map = new Map<string, SnapshotRow>();
      for (const row of (data ?? []) as SnapshotRow[]) {
        // Rows arrive newest-first; keep only the first (latest) per analysis_id.
        if (!map.has(row.analysis_id)) map.set(row.analysis_id, row);
      }
      return map;
    },
    enabled: analysisIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const getCanonicalVariables = useCallback(
    (analysisId: string): Record<string, DocumentVariable> | null => {
      const analysis = analyses?.find((a) => a.id === analysisId);
      if (!analysis) return null;
      const snapshot = snapshotsByAnalysisId?.get(analysisId);
      const canonical = toCanonicalSnapshot(analysis, snapshot);
      return mapCanonicalModelToDocumentVariables(canonical);
    },
    [analyses, snapshotsByAnalysisId],
  );

  const mapAnalysisToAutoFill = useCallback(
    (analysis: AnalysisSummary): AutoFillData => {
      const snapshot = snapshotsByAnalysisId?.get(analysis.id);
      const canonical = toCanonicalSnapshot(analysis, snapshot);
      const variables = mapCanonicalModelToDocumentVariables(canonical);
      return toAutoFillData(analysis, variables);
    },
    [snapshotsByAnalysisId],
  );

  const getAutoFillData = useCallback(
    (analysisId: string): AutoFillData | null => {
      const analysis = analyses?.find((a) => a.id === analysisId);
      if (!analysis) {
        toast.error('Analysis not found');
        return null;
      }

      setSelectedAnalysisId(analysisId);
      const data = mapAnalysisToAutoFill(analysis);
      toast.success('Fields auto-filled from analysis');
      return data;
    },
    [analyses, mapAnalysisToAutoFill],
  );

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
    getCanonicalVariables,
    hasAnalyses: (analyses?.length || 0) > 0,
  };
}
