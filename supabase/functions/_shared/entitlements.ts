/**
 * SERVER-SIDE ENTITLEMENT GUARD
 * ==============================
 * The ONLY trusted source of tier enforcement. Client flags are cosmetic.
 *
 * USAGE in any edge function:
 *
 *   import { requireFeature, requireUsage, getUserTier } from "../_shared/entitlements.ts";
 *
 *   const tier = await requireFeature(supabaseAdmin, userId, 'depthFull', '/analyze-business');
 *   const quota = await requireUsage(supabaseAdmin, userId, 'analysesPerMonth', '/analyze-business');
 *
 * Both throw EntitlementError on denial. Catch at route boundary → return 403.
 *
 * RULES:
 * - Fail CLOSED: unknown tier / no subscription → 'free'.
 * - Every denial logs to entitlement_denials for observability.
 * - Quota consumption uses atomic RPCs (consume_analysis_quota / consume_download_quota)
 *   to prevent race conditions on multi-tab / concurrent submits.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// ---------- Inline tier matrix (mirrors src/config/tiers.ts) ----------
// Edge functions can't import from src/, so we duplicate the relevant slices.
// If you change one, change BOTH. Tested by integration tests in commit 10.

export type TierId = 'free' | 'plus' | 'pro';
export type FeatureKey =
  | 'depthQuick' | 'depthFull' | 'depthPro'
  | 'preMortem' | 'invoiceCapacity' | 'documentStudio' | 'aiDocIntelligence'
  | 'customBranding' | 'whiteLabel' | 'unlimitedHistory' | 'watermarkFree'
  | 'apiAccess' | 'tamSamSom' | 'pitchDeck' | 'strategicRoadmap'
  | 'fiveYearModel' | 'actionPlan';
export type LimitKey = 'analysesPerMonth' | 'downloadsPerDay' | 'projectionMonths' | 'monteCarloScenarios' | 'teamSeats' | 'templates';

export const FEATURES: Record<TierId, Record<FeatureKey, boolean>> = {
  free: {
    depthQuick: true, depthFull: false, depthPro: false,
    preMortem: false, invoiceCapacity: false, documentStudio: false, aiDocIntelligence: false,
    customBranding: false, whiteLabel: false, unlimitedHistory: false, watermarkFree: false,
    apiAccess: false, tamSamSom: false, pitchDeck: false, strategicRoadmap: false,
    fiveYearModel: false, actionPlan: false,
  },
  plus: {
    depthQuick: true, depthFull: true, depthPro: false,
    preMortem: true, invoiceCapacity: true, documentStudio: true, aiDocIntelligence: true,
    customBranding: true, whiteLabel: false, unlimitedHistory: true, watermarkFree: true,
    apiAccess: false, tamSamSom: false, pitchDeck: false, strategicRoadmap: false,
    fiveYearModel: false, actionPlan: true,
  },
  pro: {
    depthQuick: true, depthFull: true, depthPro: true,
    preMortem: true, invoiceCapacity: true, documentStudio: true, aiDocIntelligence: true,
    customBranding: true, whiteLabel: true, unlimitedHistory: true, watermarkFree: true,
    apiAccess: true, tamSamSom: true, pitchDeck: true, strategicRoadmap: true,
    fiveYearModel: true, actionPlan: true,
  },
};

export const LIMITS: Record<TierId, Record<LimitKey, number>> = {
  free: { analysesPerMonth: 5, downloadsPerDay: 5, projectionMonths: 0, monteCarloScenarios: 0, teamSeats: 0, templates: 3 },
  plus: { analysesPerMonth: Infinity, downloadsPerDay: Infinity, projectionMonths: 36, monteCarloScenarios: 95_500, teamSeats: 1, templates: 12 },
  pro:  { analysesPerMonth: Infinity, downloadsPerDay: Infinity, projectionMonths: 60, monteCarloScenarios: 95_500, teamSeats: 3, templates: 12 },
};

// ---------- Errors ----------

export class EntitlementError extends Error {
  public readonly statusCode = 403;
  public readonly code: string;
  constructor(
    public readonly feature: FeatureKey | LimitKey,
    public readonly currentTier: TierId,
    public readonly reason: 'feature_locked' | 'quota_exceeded' = 'feature_locked',
    public readonly meta: Record<string, unknown> = {},
  ) {
    super(`Entitlement denied: '${feature}' on tier '${currentTier}' (${reason})`);
    this.code = reason === 'quota_exceeded' ? 'QUOTA_EXCEEDED' : 'FEATURE_LOCKED';
  }

  toResponse(corsHeaders: Record<string, string> = {}): Response {
    return new Response(
      JSON.stringify({
        error: this.code,
        message: this.message,
        feature: this.feature,
        currentTier: this.currentTier,
        reason: this.reason,
        ...this.meta,
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}

// ---------- Tier resolution ----------

interface SubscriptionRow {
  plan_id?: string | null;        // ← actual column name in `subscriptions`
  status?: string | null;
  billing_cycle?: string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  is_legacy_price?: boolean | null;
}

export function resolveTier(sub: SubscriptionRow | null | undefined): TierId {
  if (!sub) return 'free';
  // Active OR trialing → use plan. Trial expiry must be respected separately:
  // if trial_ends_at is in the past AND status is still 'trialing', fail closed.
  if (sub.status === 'trialing' && sub.trial_ends_at) {
    if (new Date(sub.trial_ends_at).getTime() < Date.now()) return 'free';
  }
  if (sub.status !== 'active' && sub.status !== 'trialing') return 'free';
  if (sub.plan_id === 'plus' || sub.plan_id === 'pro') return sub.plan_id;
  return 'free';
}

/**
 * Get the user's active tier. Reads `subscriptions` table.
 * FAIL CLOSED: any error → 'free'.
 */
export async function getUserTier(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ tier: TierId; subscription: SubscriptionRow | null }> {
  if (!userId) return { tier: 'free', subscription: null };

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan_id, status, billing_cycle, trial_ends_at, current_period_end, is_legacy_price')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[entitlements] getUserTier error:', error.message);
      return { tier: 'free', subscription: null };
    }
    return { tier: resolveTier(data), subscription: data ?? null };
  } catch (e) {
    console.error('[entitlements] getUserTier exception:', e);
    return { tier: 'free', subscription: null };
  }
}

// ---------- Feature checks ----------

/**
 * Throw EntitlementError if user's tier doesn't have the feature.
 * Logs denial to entitlement_denials.
 */
export async function requireFeature(
  supabase: SupabaseClient,
  userId: string,
  feature: FeatureKey,
  path?: string,
): Promise<TierId> {
  const { tier } = await getUserTier(supabase, userId);
  if (!FEATURES[tier][feature]) {
    await logDenial(supabase, userId, tier, feature, path);
    throw new EntitlementError(feature, tier, 'feature_locked');
  }
  return tier;
}

export async function hasFeature(
  supabase: SupabaseClient,
  userId: string,
  feature: FeatureKey,
): Promise<boolean> {
  const { tier } = await getUserTier(supabase, userId);
  return FEATURES[tier][feature];
}

// ---------- Quota checks (atomic) ----------

/**
 * Consume one analysis from the monthly quota. Atomic — race-safe.
 * Returns { tier, used, limit } on success. Throws on quota exceeded.
 */
export async function requireAnalysisQuota(
  supabase: SupabaseClient,
  userId: string,
  path?: string,
): Promise<{ tier: TierId; used: number; limit: number }> {
  const { tier } = await getUserTier(supabase, userId);
  const limit = LIMITS[tier].analysesPerMonth;

  // Unlimited tiers: skip the quota RPC entirely
  if (!isFinite(limit)) {
    return { tier, used: 0, limit: Number.MAX_SAFE_INTEGER };
  }

  const { data, error } = await supabase.rpc('consume_analysis_quota', {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error) {
    console.error('[entitlements] consume_analysis_quota error:', error.message);
    // Fail closed: treat RPC failure as quota exceeded
    await logDenial(supabase, userId, tier, 'analysesPerMonth', path, { rpc_error: error.message });
    throw new EntitlementError('analysesPerMonth', tier, 'quota_exceeded', { rpcError: true });
  }

  const result = data as { allowed: boolean; used: number; limit: number };
  if (!result?.allowed) {
    await logDenial(supabase, userId, tier, 'analysesPerMonth', path, { used: result?.used, limit });
    throw new EntitlementError('analysesPerMonth', tier, 'quota_exceeded', {
      used: result?.used,
      limit,
      resetsAt: getMonthlyResetISO(),
    });
  }
  return { tier, used: result.used, limit };
}

/**
 * Consume one download from the daily quota. Atomic — race-safe.
 */
export async function requireDownloadQuota(
  supabase: SupabaseClient,
  userId: string,
  path?: string,
): Promise<{ tier: TierId; used: number; limit: number }> {
  const { tier } = await getUserTier(supabase, userId);
  const limit = LIMITS[tier].downloadsPerDay;

  if (!isFinite(limit)) {
    return { tier, used: 0, limit: Number.MAX_SAFE_INTEGER };
  }

  const { data, error } = await supabase.rpc('consume_download_quota', {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error) {
    console.error('[entitlements] consume_download_quota error:', error.message);
    await logDenial(supabase, userId, tier, 'downloadsPerDay', path, { rpc_error: error.message });
    throw new EntitlementError('downloadsPerDay', tier, 'quota_exceeded', { rpcError: true });
  }

  const result = data as { allowed: boolean; used: number; limit: number };
  if (!result?.allowed) {
    await logDenial(supabase, userId, tier, 'downloadsPerDay', path, { used: result?.used, limit });
    throw new EntitlementError('downloadsPerDay', tier, 'quota_exceeded', {
      used: result?.used,
      limit,
      resetsAt: getDailyResetISO(),
    });
  }
  return { tier, used: result.used, limit };
}

// ---------- Helpers ----------

/** Limit lookup without consumption. Use for read-only UI hydration. */
export function getLimit(tier: TierId, key: LimitKey): number {
  return LIMITS[tier][key];
}

export function hasFeatureSync(tier: TierId, feature: FeatureKey): boolean {
  return FEATURES[tier][feature];
}

/**
 * Coerce a requested analysis depth down to what the tier allows.
 * Free user sending depth='full' → coerced to 'quick' (no error, just downgrade).
 * Use this when you want graceful degradation; use requireFeature() when you want a hard 403.
 */
export function coerceDepth(tier: TierId, requested: string | undefined): 'quick' | 'full' | 'pro' {
  const req = (requested ?? 'quick').toLowerCase();
  if (req === 'pro' && FEATURES[tier].depthPro) return 'pro';
  if ((req === 'pro' || req === 'full') && FEATURES[tier].depthFull) return 'full';
  return 'quick';
}

/**
 * Strip Plus/Pro-only fields from an analysis result before returning to a Free user.
 * Critical: prevents compute leakage even if a Free user crafts a request that
 * accidentally runs the full engine. The engine may produce a full payload —
 * this guarantees the wire response is Free-tier-shaped.
 */
export function sanitizeResultForTier<T extends Record<string, unknown>>(tier: TierId, result: T): Partial<T> {
  if (tier !== 'free') return result;
  // Free shape: score + top 3 risks + base revenue only.
  const safe: Record<string, unknown> = {};
  if ('score' in result) safe.score = (result as any).score;
  if ('confidence_score' in result) safe.confidence_score = (result as any).confidence_score;
  if ('verdict' in result) safe.verdict = (result as any).verdict;
  if ('top_risks' in result) safe.top_risks = ((result as any).top_risks ?? []).slice(0, 3);
  if ('risks' in result) safe.risks = ((result as any).risks ?? []).slice(0, 3);
  if ('revenue' in result && (result as any).revenue?.base !== undefined) {
    safe.revenue = { base: (result as any).revenue.base };
  } else if ('base_revenue' in result) {
    safe.base_revenue = (result as any).base_revenue;
  }
  safe._tier = 'free';
  safe._upgradeMessage = 'Upgrade to Plus for full Monte Carlo, 36-month projections, and stress testing.';
  return safe as Partial<T>;
}

async function logDenial(
  supabase: SupabaseClient,
  userId: string,
  tier: TierId,
  feature: FeatureKey | LimitKey,
  path?: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.rpc('log_entitlement_denial', {
      p_user_id: userId,
      p_tier: tier,
      p_feature: String(feature),
      p_path: path ?? null,
      p_meta: meta,
    });
  } catch (e) {
    console.error('[entitlements] logDenial failed (non-fatal):', e);
  }
}

function getMonthlyResetISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}

function getDailyResetISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString();
}

/**
 * Downgrade semantics (for reference / docs):
 * - Plus → Free at period end: historical analyses stay read-only, locked features re-lock,
 *   custom branding uploads stay but can't be applied to NEW exports, 30-day grace to export PDFs,
 *   then archived=true (never hard-deleted).
 * - Pro → Plus: same pattern for Pro-only features (5-year, TAM/SAM/SOM, pitch deck).
 * - NEVER hard-delete historical data on downgrade.
 *
 * The actual archival job runs in a scheduled function (commit 7+).
 */
