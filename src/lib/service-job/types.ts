/**
 * Service Job Quoting — TypeScript types
 * Mirrors supabase/migrations/20260525120000_service_job_engine.sql
 * Additive feature; isolated from existing engines.
 */

export type TradeId = 'electrical' | 'plumbing' | 'hvac' | (string & {});

export type JobStatus =
  | 'draft'
  | 'quoted'
  | 'sent'
  | 'won'
  | 'lost'
  | 'completed';

export interface ServiceJobTrade {
  id: TradeId;
  display_name: string;
  default_overhead_pct: number;
  default_margin_pct: number;
  active: boolean;
}

export interface AssemblyMaterial {
  sku?: string;
  name: string;
  quantity_per_unit: number;
  unit_cost: number;
  unit?: string;
}

export interface ServiceJobAssembly {
  id: string;
  trade_id: TradeId;
  code: string;
  name: string;
  unit: string;
  labor_hours_p25: number;
  labor_hours_p50: number;
  labor_hours_p75: number;
  materials: AssemblyMaterial[];
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface ScopeItem {
  assembly_id: string;
  quantity: number;
  /** 0.5 (easy) – 3.0 (very difficult). Default 1.0. */
  difficulty_factor: number;
  notes?: string;
}

export interface JobModifiers {
  access_difficulty?: number;
  height_factor?: number;
  permit_required?: boolean;
  permit_fee?: number;
  after_hours?: boolean;
  emergency?: boolean;
  weekend?: boolean;
  travel_miles?: number;
  [key: string]: unknown;
}

/**
 * Input shape consumed by `calculateQuote`. Pure data — no IDs or timestamps.
 */
export interface ServiceJobInput {
  trade_id: TradeId;
  scope_items: ScopeItem[];
  modifiers: JobModifiers;
  pricing_profile: PricingProfile;
  year_built?: number | null;
  building_type?: string | null;
  site_zip?: string | null;
  job_type?: string;
}


export interface PricingProfile {
  hourly_rate_journeyman: number;
  hourly_rate_helper?: number;
  overhead_pct: number;
  target_margin_pct: number;
  material_markup_pct: number;
  waste_factor_default: number;
  tax_rate: number;
}

export interface PriceBand {
  price: number;
  margin_pct: number;
  win_probability: number;
  label?: string;
}

export type RiskSeverity = 'low' | 'medium' | 'high';

export type RiskCategory =
  | 'variance'
  | 'building_age'
  | 'difficulty'
  | 'after_hours'
  | 'missing_scope'
  | 'other';

export interface RiskFlag {
  code: string;
  category: RiskCategory;
  message: string;
  severity: RiskSeverity;
  impact_estimate?: string;
  field?: string;
}


export interface MonteCarloOutput {
  iterations: number;
  cost_p10: number;
  cost_p50: number;
  cost_p90: number;
  cost_p95: number;
  margin_p10: number;
  margin_p50: number;
  margin_p90: number;
  loss_probability: number;
  prob_margin_below_target: number;
}


export interface QuoteCostBreakdown {
  labor: number;
  materials: number;
  subs_and_fees: number;
  overhead: number;
  /** Implied profit at the balanced price band. */
  profit_at_balanced: number;
  effective_labor_hours: number;
  /** Total multiplier on labor hours (labor_premium × site_premium). */
  labor_multiplier: number;
  /** emergency/after_hours/weekend additive premium, capped. */
  labor_premium_multiplier: number;
  /** access × height premium, clamped. */
  site_premium_multiplier: number;
  hourly_rate: number;
}

export interface QuoteResult {
  baseline_cost: number;
  baseline_price: number;
  price_bands: {
    aggressive: PriceBand;
    balanced: PriceBand;
    defensive: PriceBand;
  };
  monte_carlo: MonteCarloOutput;
  risks: RiskFlag[];
  /** Deterministic cost composition. Optional for back-compat with old saved quotes. */
  cost_breakdown?: QuoteCostBreakdown;
  /** ISO timestamp */
  computed_at: string;
}

export interface ServiceJob {
  id: string;
  user_id: string;
  trade_id: TradeId;
  client_name: string | null;
  site_address: string | null;
  site_zip: string | null;
  building_type: string | null;
  year_built: number | null;
  scope_items: ScopeItem[];
  modifiers: JobModifiers;
  pricing_profile: PricingProfile;
  quote_result: QuoteResult | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceJobOutcome {
  id: string;
  job_id: string;
  actual_labor_hours: number | null;
  actual_materials_cost: number | null;
  actual_total_cost: number | null;
  actual_revenue: number | null;
  notes: string | null;
  recorded_at: string;
}
