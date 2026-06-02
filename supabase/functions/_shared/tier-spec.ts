/**
 * AIWMC Quantis — Master Tier Specification
 * Single source of truth. Mirrors `Quantis_Master_Prompt_Tier_Spec_v1.docx` v1.0.
 *
 * Any change to FEATURE_MANIFEST, output schemas, or upgrade strings MUST be
 * reflected back into the spec document before merging. See spec §11 ("Final Note").
 *
 * This module is environment-agnostic — pure TS, no React, no Deno globals — so
 * the same source of truth can be imported by:
 *   - React app (`src/lib/tier-spec.ts`)
 *   - Edge functions (`supabase/functions/_shared/tier-spec.ts`, identical copy)
 */

// ─── Tier identifiers ───────────────────────────────────────────────────────
export type Tier = 'FREE' | 'PLUS' | 'PRO';

/** Plan identifiers as stored in `subscriptions.plan_id` (lowercase). */
export type PlanId = 'free' | 'plus' | 'pro' | 'enterprise';

/** Canonical mapping from DB plan_id → spec Tier. Enterprise inherits PRO. */
export const PLAN_TO_TIER: Record<PlanId, Tier> = {
  free: 'FREE',
  plus: 'PLUS',
  pro: 'PRO',
  enterprise: 'PRO',
};

export function planToTier(planId: string | null | undefined): Tier {
  if (!planId) return 'FREE';
  const key = planId.toLowerCase() as PlanId;
  return PLAN_TO_TIER[key] ?? 'FREE';
}

// ─── Endpoint catalog (spec §9.1) ───────────────────────────────────────────
export const ENDPOINTS = {
  ANALYSE_MAIN: '/api/analyse/main',
  ANALYSE_PREMORTEM: '/api/analyse/premortem',
  ANALYSE_PRO_EXTENSION: '/api/analyse/pro-extension',
  TOOLS_CAPACITY_CHECK: '/api/tools/capacity-check',
  DOCUMENTS_STUDIO: '/api/documents/studio',
  DOCUMENTS_EXPORT: '/api/documents/export',
  TEAM_INVITE: '/api/team/invite',
  API_KEY_GENERATE: '/api/api-key/generate',
  AI_DOC_INTELLIGENCE: '/api/ai-doc-intelligence',
} as const;

export type EndpointId = (typeof ENDPOINTS)[keyof typeof ENDPOINTS];

// ─── Feature manifest (spec §8.1) ───────────────────────────────────────────
export interface FeatureManifest {
  allowed_endpoints: readonly string[];
  blocked_endpoints: readonly string[];
  monthly_analysis_limit: number; // Number.POSITIVE_INFINITY = unlimited
  pdf_daily_limit: number;
  history: boolean;
  watermark: boolean;
  white_label: boolean;
  api_access: boolean;
  team_seats: number;
  /** '__ALL__' means no field stripping. */
  allowed_output_fields: readonly string[] | '__ALL__';
}

const FREE_OUTPUT_FIELDS = [
  'tier',
  'disclaimer',
  'viability_score',
  'score_rationale',
  'critical_risks',
  'base_revenue_estimate',
  'upgrade_nudge',
] as const;

const PLUS_OUTPUT_FIELDS = [
  ...FREE_OUTPUT_FIELDS,
  'generated_at',
  'analysis_id',
  'idea_summary',
  'twelve_variables',
  'monte_carlo',
  'pnl_36_month',
  'action_plan',
  'unit_economics',
  'document_studio_ready',
  // pre-mortem
  'module',
  'baseline_churn_rate',
  'churn_shock',
  'cost_spike_shock',
  'concentration_shock',
  'combined_shock',
  // capacity check
  'recommendation',
  'recommendation_rationale',
  'cash_flow_bridge',
  'capacity_assessment',
  'engagement_economics',
  'conditions',
] as const;

export const FEATURE_MANIFEST: Record<Tier, FeatureManifest> = {
  FREE: {
    allowed_endpoints: [
      ENDPOINTS.ANALYSE_MAIN,
      ENDPOINTS.DOCUMENTS_STUDIO,
      ENDPOINTS.DOCUMENTS_EXPORT,
    ],
    blocked_endpoints: [
      ENDPOINTS.ANALYSE_PREMORTEM,
      ENDPOINTS.ANALYSE_PRO_EXTENSION,
      ENDPOINTS.TOOLS_CAPACITY_CHECK,
      ENDPOINTS.TEAM_INVITE,
      ENDPOINTS.API_KEY_GENERATE,
      ENDPOINTS.AI_DOC_INTELLIGENCE,
    ],
    monthly_analysis_limit: 5,
    pdf_daily_limit: 5,
    history: false,
    watermark: true,
    white_label: false,
    api_access: false,
    team_seats: 0,
    allowed_output_fields: FREE_OUTPUT_FIELDS,
  },
  PLUS: {
    allowed_endpoints: [
      ENDPOINTS.ANALYSE_MAIN,
      ENDPOINTS.ANALYSE_PREMORTEM,
      ENDPOINTS.TOOLS_CAPACITY_CHECK,
      ENDPOINTS.DOCUMENTS_STUDIO,
      ENDPOINTS.DOCUMENTS_EXPORT,
      ENDPOINTS.AI_DOC_INTELLIGENCE,
    ],
    blocked_endpoints: [
      ENDPOINTS.ANALYSE_PRO_EXTENSION,
      ENDPOINTS.TEAM_INVITE,
      ENDPOINTS.API_KEY_GENERATE,
    ],
    monthly_analysis_limit: Number.POSITIVE_INFINITY,
    pdf_daily_limit: Number.POSITIVE_INFINITY,
    history: true,
    watermark: false,
    white_label: false,
    api_access: false,
    team_seats: 0,
    allowed_output_fields: PLUS_OUTPUT_FIELDS,
  },
  PRO: {
    allowed_endpoints: [
      ENDPOINTS.ANALYSE_MAIN,
      ENDPOINTS.ANALYSE_PREMORTEM,
      ENDPOINTS.ANALYSE_PRO_EXTENSION,
      ENDPOINTS.TOOLS_CAPACITY_CHECK,
      ENDPOINTS.DOCUMENTS_STUDIO,
      ENDPOINTS.DOCUMENTS_EXPORT,
      ENDPOINTS.AI_DOC_INTELLIGENCE,
      ENDPOINTS.TEAM_INVITE,
      ENDPOINTS.API_KEY_GENERATE,
    ],
    blocked_endpoints: [],
    monthly_analysis_limit: Number.POSITIVE_INFINITY,
    pdf_daily_limit: Number.POSITIVE_INFINITY,
    history: true,
    watermark: false,
    white_label: true, // gated again by user.white_label_enabled
    api_access: true,
    team_seats: 3,
    allowed_output_fields: '__ALL__',
  },
};

// ─── LLM token budget (spec §1.3) ───────────────────────────────────────────
export interface LlmBudget {
  max_tokens: number;
  temperature: number;
  top_p: number;
  monte_carlo_iterations: number | null;
  pnl_horizon_months: number | null;
  retry_on_schema_fail: number;
  timeout_ms: number;
  response_format: 'json_object';
}

export const LLM_BUDGET: Record<Tier, LlmBudget> = {
  FREE: {
    max_tokens: 1_200,
    temperature: 0.2,
    top_p: 0.9,
    monte_carlo_iterations: null,
    pnl_horizon_months: null,
    retry_on_schema_fail: 1,
    timeout_ms: 15_000,
    response_format: 'json_object',
  },
  PLUS: {
    max_tokens: 4_800,
    temperature: 0.2,
    top_p: 0.9,
    monte_carlo_iterations: 95_500,
    pnl_horizon_months: 36,
    retry_on_schema_fail: 2,
    timeout_ms: 45_000,
    response_format: 'json_object',
  },
  PRO: {
    max_tokens: 9_600,
    temperature: 0.15,
    top_p: 0.85,
    monte_carlo_iterations: 95_500,
    pnl_horizon_months: 60,
    retry_on_schema_fail: 3,
    timeout_ms: 90_000,
    response_format: 'json_object',
  },
};

// ─── Gate result envelopes (spec §9.2) ──────────────────────────────────────
export interface TierGateBlock {
  blocked: true;
  status: 402;
  body: {
    success: false;
    error: 'TIER_GATE' | 'QUOTA_EXCEEDED';
    message: string;
    required_tier: 'PLUS' | 'PRO';
    upgrade_url: string;
    cta: string;
    resets_at?: string;
  };
}
export interface TierGateAllow {
  blocked: false;
  manifest: FeatureManifest;
  tier: Tier;
}
export type TierGateResult = TierGateAllow | TierGateBlock;

const UPGRADE_URL = 'https://www.aiwmcquantis.com/pricing';

/**
 * Pure gate evaluator. Inputs are explicit (no IO). Use this from React for
 * preflight UI and from edge functions for enforcement — same logic, two callers.
 */
export function evaluateGate(args: {
  tier: Tier;
  endpoint: string;
  monthlyAnalysesUsed?: number;
  resetsAt?: string;
}): TierGateResult {
  const { tier, endpoint, monthlyAnalysesUsed = 0, resetsAt } = args;
  const manifest = FEATURE_MANIFEST[tier];

  // Layer 1a: endpoint gate
  if (manifest.blocked_endpoints.includes(endpoint)) {
    const requiredTier: 'PLUS' | 'PRO' =
      tier === 'FREE' ? 'PLUS' : 'PRO';
    return {
      blocked: true,
      status: 402,
      body: {
        success: false,
        error: 'TIER_GATE',
        message: 'This feature requires a higher plan.',
        required_tier: requiredTier,
        upgrade_url: UPGRADE_URL,
        cta:
          requiredTier === 'PLUS'
            ? 'Unlock with Plus — $17/mo'
            : 'Unlock with Pro — $49/mo',
      },
    };
  }

  // Layer 1b: monthly quota gate (FREE only on main analyse)
  if (
    tier === 'FREE' &&
    endpoint === ENDPOINTS.ANALYSE_MAIN &&
    monthlyAnalysesUsed >= manifest.monthly_analysis_limit
  ) {
    return {
      blocked: true,
      status: 402,
      body: {
        success: false,
        error: 'QUOTA_EXCEEDED',
        message: 'You have used your 5 free analyses this month.',
        required_tier: 'PLUS',
        upgrade_url: UPGRADE_URL,
        cta: 'Get unlimited analyses — Upgrade to Plus',
        resets_at: resetsAt,
      },
    };
  }

  return { blocked: false, manifest, tier };
}

/** Layer 3 — output field stripper. */
export function stripToTierFields<T extends Record<string, unknown>>(
  output: T,
  tier: Tier,
): Partial<T> {
  const manifest = FEATURE_MANIFEST[tier];
  if (manifest.allowed_output_fields === '__ALL__') return output;
  const allowed = new Set<string>(manifest.allowed_output_fields);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(output)) {
    if (allowed.has(k)) result[k] = v;
  }
  return result as Partial<T>;
}

/** Convenience UI checker — does this tier have access to a feature key? */
export type FeatureKey =
  | 'unlimited_analyses'
  | 'monte_carlo'
  | 'pnl_36_month'
  | 'action_plan'
  | 'pre_mortem'
  | 'capacity_check'
  | 'document_studio'
  | 'clean_pdf_export'
  | 'ai_doc_intelligence'
  | 'history'
  | 'five_year_model'
  | 'tam_sam_som'
  | 'pitch_deck_data'
  | 'strategic_roadmap'
  | 'white_label'
  | 'team_seats'
  | 'api_access';

export const FEATURE_TIER_REQUIREMENT: Record<FeatureKey, Tier> = {
  unlimited_analyses: 'PLUS',
  monte_carlo: 'PLUS',
  pnl_36_month: 'PLUS',
  action_plan: 'PLUS',
  pre_mortem: 'PLUS',
  capacity_check: 'PLUS',
  document_studio: 'PLUS',
  clean_pdf_export: 'PLUS',
  ai_doc_intelligence: 'PLUS',
  history: 'PLUS',
  five_year_model: 'PRO',
  tam_sam_som: 'PRO',
  pitch_deck_data: 'PRO',
  strategic_roadmap: 'PRO',
  white_label: 'PRO',
  team_seats: 'PRO',
  api_access: 'PRO',
};

const TIER_RANK: Record<Tier, number> = { FREE: 0, PLUS: 1, PRO: 2 };

export function hasFeature(tier: Tier, feature: FeatureKey): boolean {
  return TIER_RANK[tier] >= TIER_RANK[FEATURE_TIER_REQUIREMENT[feature]];
}

// ─── Upgrade trigger library (spec §10) ─────────────────────────────────────
export interface UpgradeMessage {
  trigger: string;
  headline: string;
  body: string;
  cta: string;
  required_tier: 'PLUS' | 'PRO';
}

export const UPGRADE_TRIGGERS: Record<string, UpgradeMessage> = {
  // §10.1 Free → Plus
  free_quota_hit: {
    trigger: 'free_quota_hit',
    headline: "You're out of free analyses",
    body: 'Your monthly analysis is used. Upgrade for unlimited, with Monte Carlo and full P&L.',
    cta: 'Unlock Unlimited — $17/mo',
    required_tier: 'PLUS',
  },
  locked_premortem: {
    trigger: 'locked_premortem',
    headline: 'Stress-test your business',
    body: 'Discover the exact churn shock, cost spike, and concentration scenario that breaks your model — before it happens.',
    cta: 'Unlock Pre-Mortem — Plus',
    required_tier: 'PLUS',
  },
  clean_pdf_export: {
    trigger: 'clean_pdf_export',
    headline: 'Remove the watermark',
    body: 'Download clean, branded PDFs unlimited times. Add your logo. Look professional.',
    cta: 'Get Clean Exports — $17/mo',
    required_tier: 'PLUS',
  },
  locked_document_studio: {
    trigger: 'locked_document_studio',
    headline: '12 documents, auto-written',
    body: 'Business case, financial projection, risk register, action tracker — all auto-populated from your analysis.',
    cta: 'Unlock Document Studio',
    required_tier: 'PLUS',
  },
  free_returning_7d: {
    trigger: 'free_returning_7d',
    headline: 'Your idea is still waiting',
    body: 'Run your full Monte Carlo analysis and get a complete 36-month P&L. Takes 90 seconds.',
    cta: 'Start Full Analysis — $17/mo',
    required_tier: 'PLUS',
  },
  // §10.2 Plus → Pro
  plus_complete_investor: {
    trigger: 'plus_complete_investor',
    headline: 'Ready for investors?',
    body: 'Get your TAM/SAM/SOM, pitch deck data package, 5-year model, and week-by-week strategic roadmap.',
    cta: 'Upgrade to Pro — $49/mo',
    required_tier: 'PRO',
  },
  plus_share_team: {
    trigger: 'plus_share_team',
    headline: 'Bring your co-founders',
    body: 'Pro includes 3 team seats so your whole founding team can access and collaborate on every analysis.',
    cta: 'Get Team Access — Pro',
    required_tier: 'PRO',
  },
  plus_embed_api: {
    trigger: 'plus_embed_api',
    headline: 'Put Quantis in your product',
    body: 'Pro API access lets you embed Quantis analyses in your own tools, dashboards, or client reports.',
    cta: 'Get API Access — Pro',
    required_tier: 'PRO',
  },
  plus_white_label: {
    trigger: 'plus_white_label',
    headline: 'White-label for clients',
    body: 'Remove all Quantis branding and deliver reports under your own brand. Pro includes full white-label.',
    cta: 'Go White-Label — Pro',
    required_tier: 'PRO',
  },
  plus_5th_analysis: {
    trigger: 'plus_5th_analysis',
    headline: 'How do investors see this?',
    body: 'Your Pro upgrade includes an investor-ready pitch deck data package and 5-year model. Start your 14-day trial.',
    cta: 'Start Pro Trial — Free 14 Days',
    required_tier: 'PRO',
  },
};

/** Upgrade nudge that ships inside the analysis JSON, per spec §3.2 / §4.2. */
export function buildUpgradeNudge(tier: Tier): UpgradeMessage | null {
  if (tier === 'FREE')
    return {
      trigger: 'free_post_analysis',
      headline: 'Want the full picture?',
      body: 'Unlock Monte Carlo simulation, 36-month P&L, and your action plan on Plus.',
      cta: 'Upgrade to Plus — $17/mo',
      required_tier: 'PLUS',
    };
  if (tier === 'PLUS') return UPGRADE_TRIGGERS.plus_complete_investor;
  return null;
}

export const SPEC_VERSION = '1.0';
