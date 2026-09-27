/**
 * Commercial Ops workflow -- product<->commercial attribution bridge.
 *
 * A prospect who signs up and uses the product needs to be traceable back
 * to the campaign that sourced them, WITHOUT giving Commercial Ops broad
 * read access to normal product/user tables. public.commercial_attributions
 * (see 20260927030000_commercial_campaigns_batches_attribution_outcomes.sql)
 * is the narrow bridge table; this module is the one server-side write path
 * onto it, so every attribution row is created the same validated way
 * regardless of which future caller writes it.
 *
 * OUT OF SCOPE for this change (see the PR description): actually capturing
 * a `?ref=`/`?campaign=`-style param at signup time and calling this
 * function from that flow. This repo already has a DIFFERENT, unrelated
 * peer-referral-rewards mechanism (src/hooks/useReferral.ts +
 * referral_codes/referral_conversions/referral_rewards, migration
 * 20260206003246) for users referring other users -- confirmed via repo
 * search before writing this. It is not a marketing-campaign attribution
 * mechanism and was deliberately NOT extended here; wiring an actual
 * signup-time capture into src/pages/Auth.tsx (or wherever the product's
 * signup flow lives) that calls recordCommercialAttribution() below is a
 * follow-up task, out of scope for this PR (frontend signup-flow changes
 * were explicitly excluded from this task).
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface RecordCommercialAttributionInput {
  prospectId: string;
  campaignId?: string | null;
  userId?: string | null;
  decisionId?: string | null;
  analysisId?: string | null;
  subscriptionId?: string | null;
}

export interface CommercialAttributionRow {
  id: string;
  prospect_id: string;
  campaign_id: string | null;
  user_id: string | null;
  decision_id: string | null;
  analysis_id: string | null;
  subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export type RecordCommercialAttributionResult =
  | { ok: true; data: CommercialAttributionRow }
  | { ok: false; error: string };

/**
 * Writes ONE row to commercial_attributions for a single conversion
 * touchpoint (prospect -> real product user/decision/analysis/subscription).
 * Callers MUST use a service-role client (this table is admin-only under
 * RLS) -- same convention as every other write in
 * supabase/functions/commercial-workflow/index.ts.
 *
 * Deliberately narrow: this function only ever touches
 * commercial_attributions. It does not read or write any other
 * product/user table, so wiring it into a future signup handler cannot
 * accidentally widen Commercial Ops' access beyond this one bridge table.
 */
export async function recordCommercialAttribution(
  svc: SupabaseClient,
  input: RecordCommercialAttributionInput,
): Promise<RecordCommercialAttributionResult> {
  if (!input.prospectId) {
    return { ok: false, error: "prospectId is required" };
  }

  const { data, error } = await svc
    .from("commercial_attributions")
    .insert({
      prospect_id: input.prospectId,
      campaign_id: input.campaignId ?? null,
      user_id: input.userId ?? null,
      decision_id: input.decisionId ?? null,
      analysis_id: input.analysisId ?? null,
      subscription_id: input.subscriptionId ?? null,
    })
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data as CommercialAttributionRow };
}
