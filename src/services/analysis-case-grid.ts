/**
 * Analysis Case Grid — fetches one of the 40 representative business cases
 * across all 11 analysis dimensions (P&L, unit econ, Monte Carlo, TAM/SAM/SOM,
 * break-even, scenarios, cash flow, DCF, DSCR, burn/runway, pre-mortem).
 *
 * Source: AIWMC Quantis 2026 Complete Analysis Dataset (95,500 datapoints).
 */
import { supabase } from '@/integrations/supabase/client';

export interface AnalysisCaseGrid {
  case_id: string;
  edge_case: Record<string, unknown> | null;
  unit_economics: Record<string, unknown> | null;
  monte_carlo: Record<string, unknown> | null;
  tam_sam_som: Record<string, unknown> | null;
  break_even: Record<string, unknown> | null;
  scenario: Record<string, unknown> | null;
  cash_flow: Record<string, unknown> | null;
  dcf: Record<string, unknown> | null;
  dscr_credit: Record<string, unknown> | null;
  burn_runway: Record<string, unknown> | null;
  pre_mortem: Record<string, unknown> | null;
}

const cache = new Map<string, Promise<AnalysisCaseGrid | null>>();

export async function getAnalysisCaseGrid(caseId: string): Promise<AnalysisCaseGrid | null> {
  if (cache.has(caseId)) return cache.get(caseId)!;
  const p = (async () => {
    const { data, error } = await supabase.rpc('get_analysis_case_grid', { p_case_id: caseId });
    if (error || !data) return null;
    return data as unknown as AnalysisCaseGrid;
  })();
  cache.set(caseId, p);
  return p;
}

/** Returns the list of 40 representative cases for browsing/selection. */
export async function listAnalysisCases(): Promise<Array<{
  case_id: string; business_idea: string; industry: string; city: string;
}>> {
  const { data, error } = await supabase
    .from('analysis_edge_cases')
    .select('case_id, business_idea, industry, city')
    .order('case_id');
  if (error || !data) return [];
  return data as Array<{ case_id: string; business_idea: string; industry: string; city: string }>;
}
