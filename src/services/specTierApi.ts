/**
 * Spec-tier client API — wraps the three new edge functions
 * (analyze-plus, analyze-pro-extension, invoice-capacity-check) in a
 * single typed surface so React components don't repeat invoke boilerplate.
 *
 * All three honour the canonical 402 TierGateBlock contract — callers can
 * surface the upgrade message directly.
 */

import { supabase } from '@/integrations/supabase/client';
import type { MonteCarloResult } from '@/lib/monte-carlo';

// ── Shared envelope ────────────────────────────────────────────────────────
export interface SpecApiSuccess<T> {
  success: true;
  tier: 'FREE' | 'PLUS' | 'PRO';
  request_id: string;
  data: T;
}
export interface SpecApiError {
  success: false;
  error: string;
  message?: string;
  required_tier?: 'PLUS' | 'PRO';
  upgrade_url?: string;
  cta?: string;
}
export type SpecApiResponse<T> = SpecApiSuccess<T> | SpecApiError;

async function invoke<T>(
  fn: 'analyze-plus' | 'analyze-pro-extension' | 'invoice-capacity-check',
  body: Record<string, unknown>
): Promise<SpecApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke<SpecApiResponse<T>>(fn, { body });
  if (error) {
    // Surface 402 body when present (TierGateBlock).
    const ctxBody = (error as any)?.context?.body;
    if (ctxBody) {
      try {
        const parsed = typeof ctxBody === 'string' ? JSON.parse(ctxBody) : ctxBody;
        if (parsed && parsed.success === false) return parsed as SpecApiError;
      } catch {
        /* fall through */
      }
    }
    return {
      success: false,
      error: 'INVOKE_ERROR',
      message: error.message ?? 'Edge function call failed.',
    };
  }
  return (data ?? {
    success: false,
    error: 'EMPTY_RESPONSE',
    message: 'Empty response from server.',
  }) as SpecApiResponse<T>;
}

// ── PLUS main analysis ─────────────────────────────────────────────────────
export interface PlusAnalysisJson {
  tier: 'PLUS';
  analysis_id: string;
  generated_at: string;
  idea_summary: string;
  viability_score: number;
  score_rationale: string;
  twelve_variables: Array<{
    variable_id: number;
    variable_name: string;
    rating: 'STRONG' | 'ADEQUATE' | 'WEAK' | 'CRITICAL';
    score: number;
    analysis: string;
    data_point: string;
  }>;
  monte_carlo: {
    scenarios_run: number;
    p10_annual_revenue_usd: number;
    p50_annual_revenue_usd: number;
    p90_annual_revenue_usd: number;
    swing_factor: string;
    failure_scenario: string;
    success_scenario: string;
    confidence_interval_note: string;
  };
  pnl_36_month: Array<Record<string, unknown>>;
  action_plan: Array<{
    rank: number;
    action: string;
    rationale: string;
    days_to_complete: number;
    owner: 'FOUNDER' | 'HIRE' | 'CONTRACTOR' | 'AUTOMATED';
    success_metric: string;
  }>;
  unit_economics: {
    estimated_cac_usd: number;
    estimated_ltv_usd: number;
    ltv_cac_ratio: number;
    ltv_cac_interpretation: string;
    payback_period_months: number;
  };
  upgrade_nudge?: { headline: string; body: string; cta: string };
}

/**
 * Adapt a completed dashboard analysis (analyze-business → BusinessAnalysisResult)
 * into the minimal `plus_analysis` payload that analyze-pro-extension requires.
 *
 * The dashboard runs analyze-business, NOT analyze-plus, so its result is a
 * different shape. analyze-pro-extension hard-requires `tier: 'PLUS'|'PRO'`
 * (else 400) and reads sector/geo from `benchmarks.*` / `industry_detected` for
 * the benchmark cascade; it then stringifies the whole object for the LLM. This
 * adapter guarantees those fields so Market Sizing (TAM/SAM/SOM) works for any
 * Plus/Pro user who has run an analysis — not just the separate spec-tier path.
 */
export function businessResultToPlusInput(
  result:
    | {
        metadata?: {
          idea?: string;
          location?: string;
          industry_detected?: string;
          analysis_id?: string;
          generated_at?: string;
        };
        confidence_score?: number;
        financial_analysis?: unknown;
        market_analysis?: unknown;
      }
    | null
    | undefined,
  idea: string,
  location: string,
  analysisId?: string | null
): Record<string, unknown> | undefined {
  if (!result) return undefined;
  const md = result.metadata ?? {};
  const industry = md.industry_detected || 'Services';
  return {
    tier: 'PLUS',
    analysis_id: analysisId || md.analysis_id || `local-${Date.now()}`,
    generated_at: md.generated_at || new Date().toISOString(),
    idea_summary: idea || md.idea || '',
    location: location || md.location || '',
    industry_detected: industry,
    benchmarks: {
      // analyze-pro-extension reads these for the benchmark cascade.
      sector_level1: industry,
      country: 'US',
      geo_region: 'US',
    },
    viability_score: result.confidence_score ?? null,
    financial_analysis: result.financial_analysis ?? null,
    market_analysis: result.market_analysis ?? null,
  };
}

export function analyzePlus(args: {
  idea: string;
  location: string;
  industry?: string;
  stage?: 'IDEA' | 'EARLY' | 'GROWTH' | 'ESTABLISHED';
  monteCarlo: MonteCarloResult;
}) {
  return invoke<PlusAnalysisJson>('analyze-plus', {
    idea: args.idea,
    location: args.location,
    industry: args.industry,
    stage: args.stage,
    monte_carlo_data: args.monteCarlo,
  });
}

// ── PRO extension ──────────────────────────────────────────────────────────
export interface ProExtensionJson {
  tier: 'PRO';
  parent_analysis_id: string;
  pro_generated_at: string;
  five_year_model: Record<string, unknown>;
  market_sizing: {
    tam: { value_usd: number; methodology: string; investor_framing: string };
    sam: { value_usd: number; tam_pct: number; investor_framing: string };
    som: { value_usd: number; sam_pct: number; investor_framing: string };
  };
  pitch_deck_data: Record<string, unknown>;
  strategic_roadmap: { weeks: Array<Record<string, unknown>> };
}

export function analyzeProExtension(args: {
  plusAnalysis: PlusAnalysisJson | Record<string, unknown>;
  marketData?: Record<string, unknown>;
}) {
  return invoke<ProExtensionJson>('analyze-pro-extension', {
    plus_analysis: args.plusAnalysis,
    market_data: args.marketData ?? {},
  });
}

// ── Invoice & Capacity Check ───────────────────────────────────────────────
export interface CapacityCheckJson {
  module: 'INVOICE_CAPACITY_CHECK';
  recommendation: 'ACCEPT' | 'ACCEPT_WITH_CONDITIONS' | 'DECLINE';
  recommendation_rationale: string;
  cash_flow_bridge: {
    current_monthly_surplus_usd: number;
    gap_during_payment_terms_usd: number;
    gap_start_day: number;
    gap_end_day: number;
    gap_severity: 'NONE' | 'MANAGEABLE' | 'CRITICAL';
    bridge_narrative: string;
  };
  capacity_assessment: {
    current_capacity_used_pct: number;
    post_acceptance_capacity_pct: number;
    quality_risk_threshold_pct: number;
    quality_risk_triggered: boolean;
    delivery_risk_narrative: string;
  };
  engagement_economics: {
    setup_cost_usd: number;
    monthly_revenue_usd: number;
    estimated_monthly_cost_usd: number;
    net_margin_pct: number;
    payback_period_months: number;
  };
  conditions: Array<{
    condition: string;
    urgency: 'BEFORE_SIGNING' | 'WITHIN_30_DAYS' | 'BEFORE_DELIVERY';
  }>;
}

export interface CapacityCheckInput {
  current_monthly_revenue_usd: number;
  current_monthly_costs_usd: number;
  current_team_capacity_pct: number;
  new_client_monthly_revenue_usd: number;
  new_client_setup_cost_usd: number;
  new_client_capacity_required_pct: number;
  new_client_payment_terms_days: number;
  current_cash_reserve_usd: number;
  parent_analysis_id?: string;
}

export function checkCapacity(input: CapacityCheckInput) {
  return invoke<CapacityCheckJson>('invoice-capacity-check', { ...input });
}
