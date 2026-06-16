/**
 * SERVER-SIDE TIER RESOLVER — plan_entitlements is the ONLY source of truth.
 * ==========================================================================
 * This deliberately ignores every client-supplied tier claim (request body,
 * JWT custom claims, headers). The flow is:
 *
 *   1. Look up the user's most recent `subscriptions` row (status active|trialing).
 *   2. Use ONLY `plan_id` to find a matching `plan_entitlements` row.
 *   3. If no row matches (or plan_id is forged like "enterprise_god_mode"),
 *      return `free` and log a `forged_claim` denial.
 *
 * Use this in any edge function that gates a paid feature. The legacy
 * `resolveTier()` in entitlements.ts uses an inlined matrix; this resolver
 * is the canonical DB-backed version per the June-12 stabilization spec.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export type TierId = 'free' | 'plus' | 'pro';

export interface EntitlementRow {
  tier: TierId;
  label: string;
  monthly_analyses: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  stripe_price_ids: string[];
}

export interface ServerTierResult {
  tier: TierId;
  entitlements: EntitlementRow;
  source: 'plan_entitlements';
  subscription_plan_id: string | null;
  rejected_claim: string | null; // if a forged plan_id was seen, recorded here
}

const FREE_FALLBACK: EntitlementRow = {
  tier: 'free',
  label: 'Free',
  monthly_analyses: 5,
  features: {},
  limits: { analysesPerMonth: 5 },
  stripe_price_ids: [],
};

/**
 * Resolve the user's tier server-side, validated against `plan_entitlements`.
 * Fail closed — anything ambiguous → 'free'.
 */
export async function resolveServerTier(
  supabaseAdmin: SupabaseClient,
  userId: string,
  opts: { claimedTier?: string | null } = {},
): Promise<ServerTierResult> {
  if (!userId) {
    return { tier: 'free', entitlements: FREE_FALLBACK, source: 'plan_entitlements', subscription_plan_id: null, rejected_claim: null };
  }

  let subPlanId: string | null = null;
  let rejected: string | null = null;

  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_id, status, trial_ends_at, updated_at')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub) {
      if (sub.status === 'trialing' && sub.trial_ends_at && new Date(sub.trial_ends_at).getTime() < Date.now()) {
        subPlanId = null; // trial expired → fail closed
      } else {
        subPlanId = (sub.plan_id ?? '').toString().toLowerCase() || null;
      }
    }
  } catch (e) {
    console.error('[server-tier] subscription lookup failed:', e);
    subPlanId = null;
  }

  // Detect forged claim mismatches — claimedTier present and != server's plan_id.
  if (opts.claimedTier && subPlanId && opts.claimedTier !== subPlanId) {
    rejected = `claimed=${opts.claimedTier} server=${subPlanId}`;
  } else if (opts.claimedTier && !subPlanId && opts.claimedTier !== 'free') {
    rejected = `claimed=${opts.claimedTier} server=free`;
  }

  if (!subPlanId) {
    return { tier: 'free', entitlements: FREE_FALLBACK, source: 'plan_entitlements', subscription_plan_id: null, rejected_claim: rejected };
  }

  // Map enterprise → pro (legacy compat). Anything else must come from DB.
  const effectivePlanId = subPlanId === 'enterprise' ? 'pro' : subPlanId;

  try {
    const { data: ent } = await supabaseAdmin
      .from('plan_entitlements')
      .select('tier, label, monthly_analyses, features, limits, stripe_price_ids')
      .eq('tier', effectivePlanId)
      .maybeSingle();

    if (!ent) {
      // Forged or unknown plan_id like "god_mode" — fail closed.
      return {
        tier: 'free',
        entitlements: FREE_FALLBACK,
        source: 'plan_entitlements',
        subscription_plan_id: subPlanId,
        rejected_claim: rejected ?? `unknown_plan_id=${subPlanId}`,
      };
    }

    return {
      tier: ent.tier as TierId,
      entitlements: {
        tier: ent.tier as TierId,
        label: ent.label,
        monthly_analyses: ent.monthly_analyses,
        features: (ent.features ?? {}) as Record<string, boolean>,
        limits: (ent.limits ?? {}) as Record<string, number>,
        stripe_price_ids: (ent.stripe_price_ids ?? []) as string[],
      },
      source: 'plan_entitlements',
      subscription_plan_id: subPlanId,
      rejected_claim: rejected,
    };
  } catch (e) {
    console.error('[server-tier] plan_entitlements lookup failed:', e);
    return { tier: 'free', entitlements: FREE_FALLBACK, source: 'plan_entitlements', subscription_plan_id: subPlanId, rejected_claim: rejected };
  }
}
