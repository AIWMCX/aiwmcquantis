// AIWMC Quantis — Stripe<->Supabase subscription reconciliation.
//
// Founder-approved 2026-09-11. Real incident this exact drift class caused:
// a subscription Stripe canceled for payment_failed on 2026-07-31 stayed
// active/pro in public.subscriptions for 5+ weeks, because its
// customer.subscription.deleted webhook event was never received. No
// monitor caught it -- it surfaced only because two independently-produced
// audit reports disagreed on the paying-customer count, and a live Stripe
// API check settled it. This job exists so that class of gap surfaces on
// its own the next time it happens, instead of persisting silently.
//
// Scope: every public.subscriptions row with status in ('active','trialing')
// AND a stripe_subscription_id that looks like a real Stripe object
// (starts with 'sub_') -- this deliberately excludes the founder's own
// manually-provisioned rows (e.g. 'sub_plus_trial_jeltovbogdan',
// 'founder_lifetime_pro', 'founder_comp_sasha'), which have no live Stripe
// object to check and would otherwise show up as false "ambiguous" drift
// every single run.
//
// Deterministic repair: Stripe status in
// ('canceled','incomplete_expired','unpaid') while Supabase still says
// active/trialing -> call the same mark_subscription_canceled RPC the
// stripe-webhook customer.subscription.deleted handler already uses. This
// reuses the one place the actual state-transition logic lives, rather than
// re-implementing "what does canceling correctly look like" a second time
// in this file.
//
// Anything else that disagrees (Stripe object not found, an unexpected
// status combination) is recorded as ambiguous and left alone -- this job
// never guesses at a repair it isn't certain about.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";
import { getRequestId } from "../_shared/request-id.ts";
import { maybeHealthResponse } from "../_shared/health.ts";

const FUNCTION_NAME = "reconcile-stripe-subscriptions";
const FUNCTION_VERSION = "1.0.0";

// The statuses that mean "Stripe considers this subscription no longer
// paying" -- if Supabase still shows active/trialing for any of these, that
// is exactly the drift class this job exists to catch.
const STRIPE_TERMINAL_STATUSES = new Set(["canceled", "incomplete_expired", "unpaid"]);

interface ReconciliationDetail {
  subscription_id: string;
  stripe_subscription_id: string;
  supabase_status: string;
  stripe_status: string | null;
  action_taken: "repaired" | "ambiguous_not_found" | "ambiguous_unexpected_status";
}

serve(async (req: Request): Promise<Response> => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;

  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const requestId = getRequestId(req);
  const log = createLogger(FUNCTION_NAME, requestId);

  // Same x-cron-secret convention already used by warm-functions,
  // check-lifecycle-emails, and send-weekly-insights -- not introducing a
  // second scheduled-call auth pattern.
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (!expectedSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!supabaseUrl || !serviceKey || !stripeKey) {
    return new Response(JSON.stringify({ error: "service_not_configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  const { data: run, error: runInsertErr } = await supabase
    .from("stripe_reconciliation_runs")
    .insert({ status: "running" })
    .select("id")
    .single();
  if (runInsertErr || !run?.id) {
    log.error(`Failed to create reconciliation run row: ${runInsertErr?.message}`);
    return new Response(JSON.stringify({ error: "run_creation_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const details: ReconciliationDetail[] = [];
  let checkedCount = 0;
  let repairedCount = 0;
  let ambiguousCount = 0;

  try {
    // KNOWN_SYNTHETIC_IDS: manually-provisioned reference IDs that are not
    // real Stripe objects despite superficially matching a 'sub_...' prefix
    // (e.g. sub_plus_trial_jeltovbogdan, the founder's own account). A bare
    // LIKE 'sub_%' filter alone would flag these every single run as a
    // benign-but-noisy "not found" ambiguous entry. Excluded explicitly by
    // name rather than by a stricter prefix heuristic, since Stripe's ID
    // format is not a contract this code should depend on.
    const KNOWN_SYNTHETIC_IDS = ["sub_plus_trial_jeltovbogdan"];
    const { data: candidates, error: candidatesErr } = await supabase
      .from("subscriptions")
      .select("id, user_id, stripe_subscription_id, status")
      .in("status", ["active", "trialing"])
      .like("stripe_subscription_id", "sub\\_%")
      .not("stripe_subscription_id", "in", `(${KNOWN_SYNTHETIC_IDS.join(",")})`);
    if (candidatesErr) throw candidatesErr;

    for (const row of candidates ?? []) {
      checkedCount++;
      let stripeSub: Stripe.Subscription | null = null;
      try {
        stripeSub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      } catch (stripeErr) {
        const isNotFound = stripeErr instanceof Stripe.errors.StripeError && stripeErr.statusCode === 404;
        ambiguousCount++;
        details.push({
          subscription_id: row.id,
          stripe_subscription_id: row.stripe_subscription_id,
          supabase_status: row.status,
          stripe_status: null,
          action_taken: "ambiguous_not_found",
        });
        log.warn(
          `Reconciliation: could not retrieve ${row.stripe_subscription_id} (${isNotFound ? "not found" : "error"}) -- left as ambiguous, no repair attempted`,
        );
        continue;
      }

      if (stripeSub.status === row.status) continue; // no drift

      if (STRIPE_TERMINAL_STATUSES.has(stripeSub.status)) {
        // Same repair the stripe-webhook customer.subscription.deleted
        // handler performs -- reusing the one RPC that owns this state
        // transition, not re-implementing it here.
        const { error: cancelErr } = await supabase.rpc("mark_subscription_canceled", {
          p_user_id: row.user_id,
          p_reason: `reconciliation_drift:stripe_status_${stripeSub.status}`,
          p_stripe_subscription_id: row.stripe_subscription_id,
        });
        if (cancelErr) {
          ambiguousCount++;
          details.push({
            subscription_id: row.id,
            stripe_subscription_id: row.stripe_subscription_id,
            supabase_status: row.status,
            stripe_status: stripeSub.status,
            action_taken: "ambiguous_unexpected_status",
          });
          log.error(`Reconciliation repair failed for ${row.stripe_subscription_id}: ${cancelErr.message}`);
          continue;
        }
        repairedCount++;
        details.push({
          subscription_id: row.id,
          stripe_subscription_id: row.stripe_subscription_id,
          supabase_status: row.status,
          stripe_status: stripeSub.status,
          action_taken: "repaired",
        });
        log.info(
          `Reconciliation repaired drift: ${row.stripe_subscription_id} was '${row.status}' in Supabase, '${stripeSub.status}' in Stripe -- canceled via mark_subscription_canceled`,
        );
      } else {
        // A status disagreement that isn't one of the known terminal
        // states (e.g. past_due, unexpected combination) -- record it,
        // never guess at the right repair.
        ambiguousCount++;
        details.push({
          subscription_id: row.id,
          stripe_subscription_id: row.stripe_subscription_id,
          supabase_status: row.status,
          stripe_status: stripeSub.status,
          action_taken: "ambiguous_unexpected_status",
        });
        log.warn(
          `Reconciliation: unexpected status combination for ${row.stripe_subscription_id} (Supabase '${row.status}', Stripe '${stripeSub.status}') -- left for manual review`,
        );
      }
    }

    await supabase
      .from("stripe_reconciliation_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        checked_count: checkedCount,
        drift_found_count: details.length,
        repaired_count: repairedCount,
        ambiguous_count: ambiguousCount,
        details,
      })
      .eq("id", run.id);

    return new Response(
      JSON.stringify({
        run_id: run.id,
        checked_count: checkedCount,
        drift_found_count: details.length,
        repaired_count: repairedCount,
        ambiguous_count: ambiguousCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Reconciliation run failed: ${message}`);
    await supabase
      .from("stripe_reconciliation_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        checked_count: checkedCount,
        drift_found_count: details.length,
        repaired_count: repairedCount,
        ambiguous_count: ambiguousCount,
        error_message: message,
        details,
      })
      .eq("id", run.id);
    return new Response(JSON.stringify({ error: "reconciliation_failed", message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
