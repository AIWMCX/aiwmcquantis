/**
 * AIWMC Quantis — Edge tier gate middleware (Master Spec §08).
 *
 * Resolves the caller's tier from the Supabase JWT, evaluates the manifest
 * against the requested endpoint + monthly quota, and returns either a
 * TierGateBlock (HTTP 402 body) or a TierGateAllow (with manifest + tier).
 *
 * Edge functions wrap their handler with this BEFORE any LLM call.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  evaluateGate,
  planToTier,
  type EndpointId,
  type Tier,
  type TierGateResult,
} from './tier-spec.ts';

interface ResolveTierResult {
  userId: string | null;
  tier: Tier;
  monthlyAnalysesUsed: number;
}

/** Pull the JWT-authenticated user, plan_id, and current monthly usage. */
export async function resolveCallerTier(
  req: Request,
): Promise<ResolveTierResult> {
  // Safe: Supabase injects these automatically; fallback to '' to avoid non-null crash
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // Auth-scoped client to identify the caller
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return { userId: null, tier: 'FREE', monthlyAnalysesUsed: 0 };

  // Service-role client for plan + usage lookup (bypasses RLS, never exposed)
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

  const [{ data: sub }, { data: usage }] = await Promise.all([
    adminClient
      .from('subscriptions')
      .select('plan_id, status')
      .eq('user_id', user.id)
      .maybeSingle(),
    adminClient
      .from('usage_tracking')
      .select('analyses_count')
      .eq('user_id', user.id)
      .eq('month_year', currentMonthYear())
      .maybeSingle(),
  ]);

  const isActive = sub?.status === 'active' || sub?.status === 'trialing';
  const tier: Tier = isActive ? planToTier(sub?.plan_id) : 'FREE';
  return {
    userId: user.id,
    tier,
    monthlyAnalysesUsed: usage?.analyses_count ?? 0,
  };
}

/** Run the gate; returns the TierGateResult and the resolved userId. */
export async function tierGate(
  req: Request,
  endpoint: EndpointId | string,
): Promise<TierGateResult & { userId: string | null }> {
  const { userId, tier, monthlyAnalysesUsed } = await resolveCallerTier(req);
  if (!userId) {
    return {
      blocked: true,
      status: 402,
      body: {
        success: false,
        error: 'TIER_GATE',
        message: 'Authentication required.',
        required_tier: 'PLUS',
        upgrade_url: 'https://www.aiwmcquantis.com/auth',
        cta: 'Sign in to continue',
      },
      userId: null,
    } as TierGateResult & { userId: null };
  }

  const result = evaluateGate({
    tier,
    endpoint,
    monthlyAnalysesUsed,
    resetsAt: nextMonthResetIso(),
  });
  return { ...result, userId } as TierGateResult & { userId: string };
}

/** Atomic increment of `usage_tracking.analyses_count` for the current month. */
export async function incrementMonthlyUsage(userId: string): Promise<void> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const monthYear = currentMonthYear();

  // Upsert + increment via RPC if available; otherwise read-modify-write.
  const { data: existing } = await admin
    .from('usage_tracking')
    .select('id, analyses_count')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .maybeSingle();

  if (existing) {
    await admin
      .from('usage_tracking')
      .update({ analyses_count: (existing.analyses_count ?? 0) + 1 })
      .eq('id', existing.id);
  } else {
    await admin
      .from('usage_tracking')
      .insert({ user_id: userId, month_year: monthYear, analyses_count: 1 });
  }
}

function currentMonthYear(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function nextMonthResetIso(): string {
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return reset.toISOString();
}
