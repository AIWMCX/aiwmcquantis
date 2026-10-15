import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { maybeHealthResponse } from '../_shared/health.ts';
import { recordServerFunnelEvent } from '../_shared/funnel-event-server.ts';
import { canSelfHealMissingRow, decidePaymentFailed } from '../_shared/payment-failed-decision.ts';
import {
  getEngagementOfferByPaymentLinkId,
  paymentLinkIdFromSession,
  validateEngagementPayment,
} from '../_shared/engagement-offers.ts';

const FUNCTION_NAME = 'stripe-webhook';
const FUNCTION_VERSION = '1.1.0';

const log = createLogger('stripe-webhook', 'module');

// QNT-P1-016: never write a raw customer email to ordinary function logs.
// Masks to first-char + domain (e.g. "j***@example.com") — enough to
// eyeball-correlate a support ticket without exposing the full address in
// Supabase function logs / Sentry breadcrumbs.
function maskEmail(email: string | null | undefined): string {
  if (!email) return '(none)';
  const at = email.indexOf('@');
  if (at <= 1) return `***${email.slice(at)}`;
  return `${email[0]}***${email.slice(at)}`;
}


// Security headers for all responses
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
};

// Exponential backoff with jitter
function calculateBackoff(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * exponentialDelay * 0.1;
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelayMs);
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry wrapper for database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  requestId: string
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = calculateBackoff(attempt);
        log.warn(`[${requestId}] ${operationName} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}), retrying in ${delay}ms:`, (error instanceof Error ? error.message : String(error)));
        await sleep(delay);
      }
    }
  }
  
  log.error(`[${requestId}] ${operationName} failed after ${RETRY_CONFIG.maxRetries + 1} attempts`);
  throw lastError;
}

log.info("=== Stripe Webhook Function Started ===");
log.info("Timestamp:", new Date().toISOString());

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  // Deploy-fidelity probe — first so it never depends on Stripe init.
  const health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (health) return health;
  const requestId = crypto.randomUUID().slice(0, 8);
  log.info(`[${requestId}] === Stripe Webhook Request ===`);
  log.info(`[${requestId}] Method: ${req.method}`);
  log.info(`[${requestId}] Timestamp: ${new Date().toISOString()}`);
  
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint - useful for testing if function is deployed
  if (req.method === "GET") {
    log.info(`[${requestId}] Health check request`);
    return new Response(
      JSON.stringify({ 
        status: "healthy", 
        message: "Stripe webhook is ready to receive events",
        timestamp: new Date().toISOString(),
        retryConfig: RETRY_CONFIG
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  }

  // Only allow POST for webhooks
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Hoisted so the outer catch can mark this event as 'failed' on errors
  // anywhere in the handler. Stripe will retry the same event.id; our
  // idempotency guard reprocesses non-'processed' rows safely.
  let inFlightEventId: string | null = null;
  let serviceClient: ReturnType<typeof createClient> | null = null;
  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    log.info(`[${requestId}] Stripe Secret Key configured: ${!!stripeSecretKey}`);
    log.info(`[${requestId}] Webhook Secret configured: ${!!webhookSecret}`);
    
    if (!stripeSecretKey || !webhookSecret) {
      log.error(`[${requestId}] Missing Stripe configuration`);
      throw new Error("Stripe keys not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    serviceClient = supabase;

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    log.info(`[${requestId}] Body length: ${body.length}`);
    log.info(`[${requestId}] Signature present: ${!!signature}`);

    if (!signature) {
      log.error(`[${requestId}] No Stripe signature in headers`);
      return new Response(
        JSON.stringify({ error: "No Stripe signature found" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify webhook signature - MUST use async version for Deno
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      inFlightEventId = event.id;
      log.info(`[${requestId}] Signature verified successfully`);
    } catch (err) {
      log.error(`[${requestId}] Signature verification failed:`, (err instanceof Error ? err.message : String(err)));
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed", details: (err instanceof Error ? err.message : String(err)) }),
        { status: 401, headers: corsHeaders }
      );
    }

    log.info(`[${requestId}] Event type: ${event.type}`);
    log.info(`[${requestId}] Event ID: ${event.id}`);

    // ATOMIC EVENT LOGGING + IDEMPOTENCY GUARD
    // ------------------------------------------
    // `stripe_webhook_events.event_id` is UNIQUE. INSERT … ON CONFLICT DO NOTHING
    // tells us atomically whether this is the FIRST time we have ever seen this
    // event.id. If it is a replay, return 200 immediately — no re-provisioning,
    // no double-charge of entitlements, no second `provision_pro_features` call.
    // This is what makes the webhook safe under Stripe's at-least-once delivery
    // semantics (Scenario #16: duplicate event.id replayed 3× must provision
    // exactly once).
    // ATOMIC EVENT LOGGING + RESILIENT IDEMPOTENCY
    // Replay is a TRUE no-op only if a prior processing attempt finished
    // (status='processed'). Rows still 'received' or 'failed' from a crashed
    // / timed-out previous attempt are allowed to re-process so Stripe's
    // exponential-backoff retries actually recover us. Provisioning RPCs are
    // already idempotent on (user_id, plan_id).
    let alreadyProcessed = false;
    try {
      const { data: insertedRows, error: insertErr } = await supabase
        .from("stripe_webhook_events")
        .upsert(
          {
            event_id: event.id,
            event_type: event.type,
            customer_id: (event.data.object as any)?.customer || null,
            status: "received",
            payload: event.data.object as any,
          },
          { onConflict: "event_id", ignoreDuplicates: true }
        )
        .select("id");
      if (insertErr) throw insertErr;
      const firstInsert = insertedRows && insertedRows.length > 0;
      if (!firstInsert) {
        // Row already exists — check whether prior attempt completed.
        const { data: existing } = await supabase
          .from("stripe_webhook_events")
          .select("status")
          .eq("event_id", event.id)
          .maybeSingle();
        alreadyProcessed = existing?.status === "processed";
        if (!alreadyProcessed) {
          log.warn(`[${requestId}] event_id=${event.id} previous attempt did not complete (status=${existing?.status}). Reprocessing.`);
          // Re-arm row for this attempt.
          await supabase.from("stripe_webhook_events")
            .update({ status: "received", error_message: null })
            .eq("event_id", event.id);
        }
      }
      log.info(`[${requestId}] event_id=${event.id} alreadyProcessed=${alreadyProcessed}`);
    } catch (logErr) {
      log.error(`[${requestId}] ⚠️ event log insert failed:`, logErr);
      // 5xx → Stripe will retry with backoff. Safer than 200-and-forget.
      return new Response(
        JSON.stringify({ received: false, error: "log_unavailable", request_id: requestId }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (alreadyProcessed) {
      log.info(`[${requestId}] DUPLICATE event.id ${event.id} (already processed) — idempotent no-op`);
      return new Response(
        JSON.stringify({ received: true, replay: true, event_id: event.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to processing (first-time path only)
    try {
      await supabase
        .from("stripe_webhook_events")
        .update({ status: "processing" })
        .eq("event_id", event.id);
    } catch (e) {
      log.warn(`[${requestId}] Could not update status to processing`);
    }


    // Helper function to find user by email (with retry)
    async function findUserByEmail(email: string): Promise<string | null> {
      log.info(`[${requestId}] Looking up user by email: ${maskEmail(email)}`);
      try {
        return await withRetry(
          async () => {
            const { data: { users }, error } = await supabase.auth.admin.listUsers();
            if (error) throw error;
            const matchedUser = users?.find(u => u.email === email);
            if (matchedUser) {
              log.info(`[${requestId}] Found user by email: ${matchedUser.id}`);
              return matchedUser.id;
            }
            log.info(`[${requestId}] No user found for email: ${maskEmail(email)}`);
            return null;
          },
          "Find user by email",
          requestId
        );
      } catch (err) {
        log.error(`[${requestId}] Error finding user by email:`, (err instanceof Error ? err.message : String(err)));
        return null;
      }
    }

    // Helper function to get customer email from Stripe (with retry)
    async function getCustomerEmail(customerId: string): Promise<string | null> {
      try {
        return await withRetry(
          async () => {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !customer.deleted && customer.email) {
              log.info(`[${requestId}] Customer email from Stripe: ${maskEmail(customer.email)}`);
              return customer.email;
            }
            return null;
          },
          "Get customer email",
          requestId
        );
      } catch (err) {
        log.error(`[${requestId}] Error fetching customer:`, (err instanceof Error ? err.message : String(err)));
        return null;
      }
    }

    // Helper function to upsert subscription with retry
    async function upsertSubscription(data: any): Promise<{ success: boolean; error?: any }> {
      try {
        await withRetry(
          async () => {
            const { error } = await supabase
              .from("subscriptions")
              .upsert(data, { onConflict: "user_id" });
            if (error) throw error;
          },
          "Upsert subscription",
          requestId
        );
        return { success: true };
      } catch (upsertError) {
        // Fallback: try INSERT
        log.info(`[${requestId}] Upsert failed, attempting INSERT fallback...`);
        try {
          await withRetry(
            async () => {
              const { error } = await supabase.from("subscriptions").insert(data);
              if (error) throw error;
            },
            "Insert subscription fallback",
            requestId
          );
          return { success: true };
        } catch (insertError) {
          return { success: false, error: insertError };
        }
      }
    }

    // Deterministic Stripe Price ID → plan mapper.
    // Pro price IDs are stored as secrets so we never confuse Plus vs Pro buyers.
    // Accepts both naming conventions for the monthly price (this function
    // historically expected STRIPE_PRO_MONTHLY_PRICE_ID while
    // create-checkout-session/index.ts historically read STRIPE_PRO_PRICE_ID
    // for the same value) so a Pro-monthly buyer is never silently
    // misclassified as Plus if only one of the two secret names was ever set.
    const PRO_PRICE_IDS = new Set<string>(
      [
        Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID"),
        Deno.env.get("STRIPE_PRO_PRICE_ID"),
        Deno.env.get("STRIPE_PRO_ANNUAL_PRICE_ID"),
      ].filter(Boolean) as string[]
    );

    // QNT-P0-008: an unrecognized price must never silently provision a paid
    // tier. Only prices we can explicitly attribute to Plus are accepted;
    // everything else (including a genuinely unknown/future price) returns
    // null so the caller fails closed instead of defaulting to "plus".
    const PLUS_PRICE_IDS = new Set<string>(
      [
        Deno.env.get("STRIPE_PLUS_MONTHLY_PRICE_ID"),
        Deno.env.get("STRIPE_PLUS_PRICE_ID"),
        Deno.env.get("STRIPE_PLUS_ANNUAL_PRICE_ID"),
      ].filter(Boolean) as string[]
    );

    function planFromSubscription(sub: Stripe.Subscription): "plus" | "pro" | null {
      const priceId = sub.items?.data?.[0]?.price?.id;
      if (priceId && PRO_PRICE_IDS.has(priceId)) {
        return "pro";
      }
      if (priceId && PLUS_PRICE_IDS.has(priceId)) {
        return "plus";
      }
      return null; // unrecognized price — fail closed, never grant a tier
    }

    switch (event.type) {
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        log.info(`[${requestId}] === Checkout Session Completed ===`);
        log.info(`[${requestId}] Session ID: ${session.id}`);
        log.info(`[${requestId}] Client Reference ID: ${session.client_reference_id}`);
        log.info(`[${requestId}] Session metadata: ${JSON.stringify(session.metadata)}`);
        log.info(`[${requestId}] Customer: ${session.customer}`);
        log.info(`[${requestId}] Customer Email: ${maskEmail(session.customer_email)}`);
        log.info(`[${requestId}] Subscription: ${session.subscription}`);

        // One-time paid-engagement Payment Links (Founder Decision Review /
        // Consultant Founding Pilot, 2026-08-30) are NOT subscriptions —
        // session.subscription is null for these, so this branch must run
        // and return BEFORE the subscription-only code below, which would
        // otherwise call stripe.subscriptions.retrieve(undefined) and error.
        // Matched on a closed, shared Payment Link catalog. Never grants
        // Plus/Pro entitlement: these are one-time founder-assisted services.
        const paymentLinkId = paymentLinkIdFromSession(session.payment_link);
        const engagementOffer = getEngagementOfferByPaymentLinkId(paymentLinkId);

        if (engagementOffer) {
          const paymentValidation = validateEngagementPayment(engagementOffer, {
            amountTotal: session.amount_total,
            currency: session.currency,
            paymentStatus: session.payment_status,
          });
          if (!paymentValidation.ok) {
            log.error(`[${requestId}] Paid-engagement validation failed for session ${session.id}: ${paymentValidation.reason}`);
            // A delayed payment method can legitimately be unpaid on
            // checkout.session.completed. A later async_payment_succeeded
            // event will re-enter this branch and fulfill exactly once.
            if (paymentValidation.reason.startsWith("payment_status_")) {
              await supabase
                .from("stripe_webhook_events")
                .update({ status: "processed", processed_at: new Date().toISOString() })
                .eq("event_id", event.id);
              return new Response(
                JSON.stringify({ received: true, fulfillment: "awaiting_payment", event_id: event.id }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            throw new Error(`paid_engagement_contract_mismatch:${paymentValidation.reason}`);
          }

          const contactEmail = session.customer_details?.email || session.customer_email || null;
          const contactName = session.customer_details?.name || contactEmail || "(unknown — pending intake)";
          const amountUsd = engagementOffer.expectedAmountMinor / 100;

          log.info(`[${requestId}] === One-time paid engagement (${engagementOffer.code}) ===`);
          log.info(`[${requestId}] Session ID: ${session.id}, amount: $${amountUsd}, email: ${maskEmail(contactEmail)}`);

          const { data: engagementRow, error: engagementErr } = await supabase
            .from("paid_engagements")
            .upsert(
              {
                stripe_checkout_session_id: session.id,
                stripe_payment_intent_id: (session.payment_intent as string) || null,
                stripe_customer_id: (session.customer as string) || null,
                offer_code: engagementOffer.code,
                engagement_type: engagementOffer.engagementType,
                contact_email: contactEmail,
                contact_name: contactName,
                price_usd: amountUsd,
                amount_paid_minor: engagementOffer.expectedAmountMinor,
                currency: engagementOffer.currency,
                payment_status: "paid",
                paid_at: new Date(session.created * 1000).toISOString(),
                status: "scheduled",
                case_capacity: engagementOffer.caseCapacity,
                cases_completed: 0,
                intake_status: "pending",
                delivery_target_hours: engagementOffer.deliveryTargetHours,
                pilot_window_days: engagementOffer.pilotWindowDays,
                pilot_ends_at: engagementOffer.pilotWindowDays
                  ? new Date((session.created + engagementOffer.pilotWindowDays * 86_400) * 1000).toISOString()
                  : null,
                engaged_at: new Date().toISOString(),
              },
              { onConflict: "stripe_checkout_session_id" }
            )
            .select("id, journey_state")
            .single();

          if (engagementErr) {
            log.error(`[${requestId}] Failed to log paid_engagements row for session ${session.id}: ${engagementErr.message}`);
            // Never acknowledge fulfillment if the internal order record did
            // not persist. Throwing returns 5xx, marks the event failed, and
            // lets Stripe retry the same event safely.
            throw new Error(`paid_engagement_persistence_failed:${engagementErr.message}`);
          }
          if (!engagementRow?.id) {
            throw new Error("paid_engagement_transition_failed:missing_engagement_id");
          }

          // The engagement row is created only after Stripe confirms payment,
          // so the webhook owns exactly one journey transition:
          // checkout_created -> payment_confirmed. The raw Stripe event ID is
          // both the idempotency key and the Stripe replay identity.
          const { error: transitionErr } = await supabase.rpc(
            "apply_engagement_transition",
            {
              p_engagement_id: engagementRow.id,
              p_next_state: "payment_confirmed",
              p_actor_user_id: null,
              p_idempotency_key: event.id,
              p_stripe_event_id: event.id,
            },
          );
          if (transitionErr) {
            log.error(
              `[${requestId}] Paid-engagement journey transition failed for session ${session.id}:`,
              transitionErr.message,
            );
            // Do not acknowledge fulfillment. The durable webhook event row is
            // marked failed by the outer catch and Stripe can safely retry.
            throw new Error(
              `paid_engagement_transition_failed:${transitionErr.message}`,
            );
          }

          log.info(
            `[${requestId}] SUCCESS: paid_engagements row logged and transitioned to payment_confirmed for session ${session.id}`,
          );

          // Fulfillment requirement #6 (2026-08-30 offer listing spec): send
          // the correct intake for the purchased offer_code. Fire-and-forget,
          // matching the cancellation_confirmed pattern below — a delivery
          // failure here must never fail the webhook or block logging the
          // engagement, which is the record of truth for the payment itself.
          if (!engagementErr && contactEmail) {
            const intakeTemplateKey = engagementOffer.engagementType === "founder_review"
              ? "founder_decision_review_intake"
              : "consultant_founding_pilot_intake";
            supabase.functions.invoke("send-lifecycle-email", {
              body: {
                email: contactEmail,
                template_key: intakeTemplateKey,
                dynamic_data: { first_name: session.customer_details?.name?.split(" ")[0] },
              },
            }).catch((err) => log.error(`[${requestId}] intake email failed for ${engagementOffer.code}:`, err instanceof Error ? err.message : String(err)));
          }

          // CRM (Zoho) Closed Won update is NOT wired here — this Supabase
          // project holds no Zoho API credentials. Per the fulfillment
          // spec's requirement #5, treat that as a manual step until Zoho
          // OAuth credentials are provisioned as function secrets and a
          // dedicated zoho-sync call is added here.
          if (!engagementErr) {
            log.warn(`[${requestId}] CRM Closed Won update NOT automated (no Zoho credentials configured) — mark lead manually for ${maskEmail(contactEmail)}`);
          }

          await supabase
            .from("stripe_webhook_events")
            .update({ status: "processed", processed_at: new Date().toISOString() })
            .eq("event_id", event.id);

          return new Response(
            JSON.stringify({ received: true, engagement_logged: true, offer_code: engagementOffer.code, event_id: event.id }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // async_payment_succeeded is relevant here only for recognized
        // one-time engagement links. It must never enter subscription logic.
        if (event.type === "checkout.session.async_payment_succeeded") {
          break;
        }

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Try multiple methods to resolve user ID
        let userId = session.client_reference_id || session.metadata?.supabase_user_id;

        // Fallback 1: Look up user by session customer_email
        if (!userId && session.customer_email) {
          userId = await findUserByEmail(session.customer_email);
        }

        // Fallback 2: Look up customer in Stripe and get email
        if (!userId && customerId) {
          const customerEmail = await getCustomerEmail(customerId);
          if (customerEmail) {
            userId = await findUserByEmail(customerEmail);
          }
        }

        if (!userId) {
          log.error(`[${requestId}] NO USER ID FOUND - cannot create subscription`);
          log.error(`[${requestId}] client_reference_id: ${session.client_reference_id}`);
          log.error(`[${requestId}] metadata: ${JSON.stringify(session.metadata)}`);
          log.error(`[${requestId}] customer_email: ${maskEmail(session.customer_email)}`);
          break;
        }

        log.info(`[${requestId}] User ID resolved: ${userId}`);

        // Get subscription details from Stripe (with retry)
        log.info(`[${requestId}] Fetching subscription details...`);
        const subscription = await withRetry(
          () => stripe.subscriptions.retrieve(subscriptionId),
          "Retrieve subscription",
          requestId
        );
        log.info(`[${requestId}] Subscription status: ${(subscription as any).status}`);

        // Map Stripe Price ID → correct plan (plus or pro)
        const plan = planFromSubscription(subscription);
        const checkoutPriceId = (subscription as any).items?.data?.[0]?.price?.id;
        log.info(`[${requestId}] Determined plan: ${plan} (price: ${checkoutPriceId})`);

        if (!plan) {
          log.error(`[${requestId}] QNT-P0-008: unrecognized Stripe price "${checkoutPriceId}" on checkout.session.completed for subscription ${subscriptionId} — refusing to provision any tier. Incident logged, no entitlement granted.`);
          return new Response(
            JSON.stringify({ received: true, error: "unrecognized_price_no_provision", event_id: event.id }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Map status. Pass through anything that isn't active/trialing as-is
        // (incomplete/incomplete_expired/unpaid/paused must never silently
        // become "active" — Finding 16-1, Stripe billing audit 2026-07-22).
        const status = (subscription as any).status === "active" || (subscription as any).status === "trialing"
          ? "active"
          : (subscription as any).status;
        log.info(`[${requestId}] Status: ${status}`);

        // Upsert subscription with retry
        log.info(`[${requestId}] Upserting subscription to database...`);
        const subscriptionData = {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan_id: plan,
          status: status,
          current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          trial_ends_at: (subscription as any).trial_end
            ? new Date((subscription as any).trial_end * 1000).toISOString()
            : null,
        };
        log.info(`[${requestId}] Subscription data:`, JSON.stringify(subscriptionData));

        const result = await upsertSubscription(subscriptionData);
        if (result.success) {
          log.info(`[${requestId}] SUCCESS: Subscription created for user ${userId}, plan: ${plan}`);

          // Record promo redemption — durable, server-verified source of truth
          // for "never show this promo invite again" (see usePromoStatus /
          // FounderPromoBanner). Only written here, after Stripe has confirmed
          // the checkout actually completed with this code applied.
          const appliedPromoCode = session.metadata?.applied_promo_code;
          if (appliedPromoCode) {
            const { error: promoErr } = await supabase
              .from("promo_redemptions")
              .upsert(
                {
                  user_id: userId,
                  promo_code: appliedPromoCode,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                },
                { onConflict: "user_id,promo_code", ignoreDuplicates: true }
              );
            if (promoErr) {
              log.error(`[${requestId}] Failed to record promo redemption:`, promoErr.message);
            } else {
              log.info(`[${requestId}] ✓ Promo redemption recorded: ${appliedPromoCode} for user ${userId}`);
            }
          }

          // ISSUE-004 — Provision PRO immediately on checkout completion so
          // the buyer gets api_keys/white-label without waiting for invoice.paid.
          if (plan === "pro") {
            try {
              const { error: provErr } = await supabase.rpc("provision_pro_features", {
                p_user_id: userId,
                p_period_end: subscriptionData.current_period_end,
                p_stripe_customer_id: customerId,
                p_stripe_subscription_id: subscriptionId,
              });
              if (provErr) log.error(`[${requestId}] provision_pro_features (checkout) error:`, provErr.message);
              else log.info(`[${requestId}] ✓ PRO features provisioned at checkout for ${userId}`);
            } catch (provErr) {
              log.error(`[${requestId}] PRO provisioning crashed (checkout):`, provErr instanceof Error ? provErr.message : String(provErr));
            }
          }
        } else {
          log.error(`[${requestId}] FAILED to create subscription:`, result.error);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
        if (!paymentIntentId) {
          log.warn(`[${requestId}] Refunded charge ${charge.id} has no PaymentIntent; no engagement to reconcile`);
          break;
        }

        const fullyRefunded = charge.refunded === true || charge.amount_refunded >= charge.amount;
        const { data: refundedRows, error: refundErr } = await supabase
          .from("paid_engagements")
          .update({
            payment_status: fullyRefunded ? "refunded" : "partially_refunded",
            refunded_at: fullyRefunded ? new Date().toISOString() : null,
            ...(fullyRefunded ? { status: "cancelled" } : {}),
          })
          .eq("stripe_payment_intent_id", paymentIntentId)
          .select("id");
        if (refundErr) throw new Error(`paid_engagement_refund_reconciliation_failed:${refundErr.message}`);
        if (refundedRows?.length) {
          log.info(`[${requestId}] Reconciled ${fullyRefunded ? "full" : "partial"} refund for paid engagement`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        log.info(`[${requestId}] === Subscription Updated ===`);
        log.info(`[${requestId}] Subscription ID: ${(subscription as any).id}`);
        log.info(`[${requestId}] Status: ${(subscription as any).status}`);
        log.info(`[${requestId}] Customer: ${(subscription as any).customer}`);

        // Map Stripe Price ID → correct plan (plus or pro)
        const plan = planFromSubscription(subscription);
        if (!plan) {
          const updatePriceId = (subscription as any).items?.data?.[0]?.price?.id;
          log.error(`[${requestId}] QNT-P0-008: unrecognized Stripe price "${updatePriceId}" on customer.subscription.updated for subscription ${(subscription as any).id} — refusing to change plan_id. Incident logged, entitlement left untouched.`);
          return new Response(
            JSON.stringify({ received: true, error: "unrecognized_price_no_provision", event_id: event.id }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Pass through anything that isn't active/trialing as-is — incomplete/
        // incomplete_expired/unpaid/paused must never silently become "active"
        // (Finding 16-1, Stripe billing audit 2026-07-22).
        let status: string = (subscription as any).status === "active" || (subscription as any).status === "trialing"
          ? "active"
          : (subscription as any).status;

        log.info(`[${requestId}] Updating - Plan: ${plan}, Status: ${status}`);

        // First, try to update by subscription ID (with retry)
        try {
          const existing = await withRetry(
            async () => {
              const { data, error } = await supabase
                .from("subscriptions")
                .select("id, user_id")
                .eq("stripe_subscription_id", (subscription as any).id)
                .maybeSingle();
              if (error) throw error;
              return data;
            },
            "Find subscription by ID",
            requestId
          );

          if (existing) {
            // Found by subscription ID - update it
            await withRetry(
              async () => {
                const { error } = await supabase
                  .from("subscriptions")
                  .update({
                    plan_id: plan,
                    status: status,
                    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
                    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                    trial_ends_at: (subscription as any).trial_end
                      ? new Date((subscription as any).trial_end * 1000).toISOString()
                      : null,
                  })
                  .eq("stripe_subscription_id", (subscription as any).id);
                if (error) throw error;
              },
              "Update subscription by ID",
              requestId
            );
            log.info(`[${requestId}] SUCCESS: Subscription updated by subscription_id`);

            // Activation-to-revenue Wave 7 (PR D): the ONLY trustworthy
            // "activated" signal -- Stripe-webhook-confirmed, never
            // client-emitted. Known gap: the email-fallback branch below
            // (subscription not found by ID) does not fire this; narrow
            // scope for this PR, documented rather than silently skipped.
            if (status === "active") {
              await recordServerFunnelEvent("subscription_activated", {
                userId: existing.user_id,
                metadata: { plan, source: "customer.subscription.updated" },
              });
            }

            // ISSUE-004 — Auto-provision PRO entitlements when the subscription
            // transitions to (or stays on) the PRO plan with active/trialing status.
            // RPC is idempotent so repeated `customer.subscription.updated` fires
            // are safe and the call is a no-op when nothing has changed.
            if (plan === "pro" && (status === "active" || status === "trialing")) {
              try {
                const { error: provErr } = await supabase.rpc("provision_pro_features", {
                  p_user_id: existing.user_id,
                  p_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                  p_stripe_customer_id: (subscription as any).customer as string,
                  p_stripe_subscription_id: (subscription as any).id,
                });
                if (provErr) {
                  log.error(`[${requestId}] provision_pro_features (updated) error:`, provErr.message);
                } else {
                  log.info(`[${requestId}] ✓ PRO features (re)provisioned for ${existing.user_id}`);
                }
              } catch (provErr) {
                log.error(`[${requestId}] PRO provisioning crashed (updated):`, provErr instanceof Error ? provErr.message : String(provErr));
              }
            }
          } else {
            // Fallback: Find user by customer email and upsert
            log.info(`[${requestId}] Subscription not found by ID, attempting email fallback...`);
            const customerEmail = await getCustomerEmail((subscription as any).customer as string);
            if (customerEmail) {
              const userId = await findUserByEmail(customerEmail);
              if (userId) {
                const result = await upsertSubscription({
                  user_id: userId,
                  stripe_customer_id: (subscription as any).customer as string,
                  stripe_subscription_id: (subscription as any).id,
                  plan_id: plan,
                  status: status,
                  current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
                  current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                  trial_ends_at: (subscription as any).trial_end
                    ? new Date((subscription as any).trial_end * 1000).toISOString()
                    : null,
                });
                if (result.success) {
                  log.info(`[${requestId}] SUCCESS: Subscription upserted via email fallback for user ${userId}`);
                } else {
                  log.error(`[${requestId}] Upsert fallback error:`, result.error);
                }
              } else {
                log.error(`[${requestId}] Could not find user for email ${maskEmail(customerEmail)}`);
              }
            } else {
              log.error(`[${requestId}] Could not get customer email for fallback`);
            }
          }
        } catch (err) {
          log.error(`[${requestId}] Subscription update failed:`, (err instanceof Error ? err.message : String(err)));
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        log.info(`[${requestId}] === Subscription Deleted (soft downgrade) ===`);
        log.info(`[${requestId}] Subscription ID: ${(subscription as any).id}`);
        log.info(`[${requestId}] Cancel reason: ${subscription.cancellation_details?.reason || 'unknown'}`);
        log.info(`[${requestId}] Period end: ${(subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : 'N/A'}`);

        try {
          const customerId = (subscription as any).customer as string;
          const activeSubscriptions = await stripe.subscriptions.list({
            customer: customerId, status: 'active', limit: 5,
          });

          if (activeSubscriptions.data.length > 0) {
            log.info(`[${requestId}] ⚠️ Customer has ${activeSubscriptions.data.length} active subscription(s) - NOT downgrading`);
            break;
          }

          // SOFT DOWNGRADE: keep plan_id intact until current_period_end.
          // Mark status='canceled' so the cron flips plan_id to 'free' at period end.
          // Pre-period-end the user retains all paid features (industry standard).
          const periodEndIso = (subscription as any).current_period_end
            ? new Date((subscription as any).current_period_end * 1000).toISOString()
            : new Date().toISOString();

          await withRetry(
            async () => {
              const { error } = await supabase
                .from("subscriptions")
                .update({
                  status: "canceled",
                  canceled_at: new Date().toISOString(),
                  current_period_end: periodEndIso,
                  // plan_id stays — flipped to 'free' by process-subscription-downgrades cron
                })
                .eq("stripe_subscription_id", (subscription as any).id);
              if (error) throw error;
            },
            "Soft-cancel subscription",
            requestId
          );

          // Find user for cancellation email
          const { data: subRow } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", (subscription as any).id)
            .maybeSingle();

          // Spec §11.3: hard-flip to FREE + open 30-day read-only window for history.
          // RPC is idempotent and writes a subscription_audit_log row.
          if (subRow?.user_id) {
            try {
              await supabase.rpc("mark_subscription_canceled", {
                p_user_id: subRow.user_id,
                p_reason: subscription.cancellation_details?.reason || "subscription_deleted",
                p_stripe_subscription_id: (subscription as any).id,
              });
              log.info(`[${requestId}] mark_subscription_canceled OK for ${subRow.user_id}`);
              await recordServerFunnelEvent("subscription_cancelled", {
                userId: subRow.user_id,
                metadata: { reason: subscription.cancellation_details?.reason || "subscription_deleted" },
              });
            } catch (rpcErr) {
              log.error(`[${requestId}] mark_subscription_canceled failed:`, rpcErr instanceof Error ? rpcErr.message : String(rpcErr));
            }
          }

          if (subRow?.user_id) {
            const periodEndHuman = new Date(periodEndIso).toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric",
            });
            // Fire-and-forget cancellation confirmation (Day 0 of win-back sequence)
            supabase.functions.invoke("send-lifecycle-email", {
              body: {
                user_id: subRow.user_id,
                template_key: "cancellation_confirmed",
                dynamic_data: { period_end_human: periodEndHuman },
              },
            }).catch((err) => log.error(`[${requestId}] cancel email failed:`, (err instanceof Error ? err.message : String(err))));
          }

          log.info(`[${requestId}] SUCCESS: Soft-canceled, retains access until ${periodEndIso}`);
        } catch (err) {
          log.error(`[${requestId}] Soft-cancel error:`, (err instanceof Error ? err.message : String(err)));
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        log.info(`[${requestId}] === Invoice Paid ===`);
        log.info(`[${requestId}] Invoice ID: ${invoice.id}`);
        log.info(`[${requestId}] Subscription: ${invoice.subscription}`);
        log.info(`[${requestId}] Customer: ${invoice.customer}`);
        log.info(`[${requestId}] Amount Paid: ${invoice.amount_paid / 100} ${invoice.currency?.toUpperCase()}`);
        log.info(`[${requestId}] Billing Reason: ${invoice.billing_reason}`);

        // CRITICAL: invoice.paid is the STRONGEST signal of an active subscription
        // If payment succeeded, user MUST have Plus access regardless of other events
        if (invoice.subscription && invoice.customer && invoice.amount_paid > 0) {
          // Fetch full subscription to sync data (with retry)
          const subscription = await withRetry(
            () => stripe.subscriptions.retrieve(invoice.subscription as string),
            "Retrieve subscription for invoice",
            requestId
          );
          
          // Map Stripe Price ID → correct plan (plus or pro)
          const plan = planFromSubscription(subscription);
          if (!plan) {
            const invoicePriceId = (subscription as any).items?.data?.[0]?.price?.id;
            log.error(`[${requestId}] QNT-P0-008: unrecognized Stripe price "${invoicePriceId}" on invoice.paid for subscription ${(subscription as any).id} — payment succeeded but refusing to provision any tier. Incident logged, requires manual review.`);
            return new Response(
              JSON.stringify({ received: true, error: "unrecognized_price_no_provision", event_id: event.id }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          const status = (subscription as any).status === "active" || (subscription as any).status === "trialing" ? "active" : (subscription as any).status;

          log.info(`[${requestId}] 💰 PAID INVOICE - Ensuring Plus access for subscription ${(subscription as any).id}`);
          log.info(`[${requestId}] Stripe subscription status: ${(subscription as any).status}`);

          // Try to update by subscription ID first
          let updated = false;
          try {
            const { data, error } = await supabase
              .from("subscriptions")
              .update({
                plan_id: plan,
                status: status,
                current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
                current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
              })
              .eq("stripe_subscription_id", (subscription as any).id)
              .select();
              
            if (!error && data && data.length > 0) {
              updated = true;
              log.info(`[${requestId}] ✓ Subscription updated from invoice.paid by subscription_id`);
            }
          } catch (err) {
            log.info(`[${requestId}] Could not update by subscription_id, trying fallback...`);
          }

          // Fallback: find user by customer email and upsert
          if (!updated) {
            const customerEmail = await getCustomerEmail(invoice.customer as string);
            if (customerEmail) {
              const userId = await findUserByEmail(customerEmail);
              if (userId) {
                const result = await upsertSubscription({
                  user_id: userId,
                  stripe_customer_id: invoice.customer as string,
                  stripe_subscription_id: (subscription as any).id,
                  plan_id: plan,
                  status: status,
                  current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
                  current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                  trial_ends_at: (subscription as any).trial_end
                    ? new Date((subscription as any).trial_end * 1000).toISOString()
                    : null,
                });
                if (result.success) {
                  log.info(`[${requestId}] ✓ Subscription synced via invoice.paid email fallback for user ${userId}`);
                } else {
                  log.error(`[${requestId}] Invoice upsert fallback error:`, result.error);
                }
              } else {
                log.error(`[${requestId}] CRITICAL: Paid invoice but cannot find user for email ${maskEmail(customerEmail)}`);
              }
            } else {
              log.error(`[${requestId}] CRITICAL: Paid invoice but cannot get customer email`);
            }
          }

          // Spec §11.3 — PRO auto-provisioning.
          // Once the paid invoice is reconciled, ensure PRO entitlements
          // (white_label_enabled, api_key, team seats) are issued. RPC is
          // idempotent so re-fires of invoice.paid are safe.
          if (plan === "pro") {
            try {
              // Resolve the user_id we just synced (try update path first, then fallback).
              const { data: provRow } = await supabase
                .from("subscriptions")
                .select("user_id")
                .eq("stripe_subscription_id", (subscription as any).id)
                .maybeSingle();
              const provisionUserId = provRow?.user_id;
              if (provisionUserId) {
                const { error: provErr } = await supabase.rpc("provision_pro_features", {
                  p_user_id: provisionUserId,
                  p_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
                  p_stripe_customer_id: invoice.customer as string,
                  p_stripe_subscription_id: (subscription as any).id,
                });
                if (provErr) {
                  log.error(`[${requestId}] provision_pro_features error:`, provErr.message);
                } else {
                  log.info(`[${requestId}] ✓ PRO features provisioned for ${provisionUserId}`);
                }
              } else {
                log.warn(`[${requestId}] PRO provisioning skipped — could not resolve user_id`);
              }
            } catch (provErr) {
              log.error(`[${requestId}] PRO provisioning crashed:`, provErr instanceof Error ? provErr.message : String(provErr));
            }
          }
        } else if (invoice.amount_paid === 0) {
          log.info(`[${requestId}] Skipping $0 invoice (likely trial or proration)`);
        }
        break;
      }

      // Spec §11.3 — failed payment: 3-day grace period, then downgrade to FREE.
      // Stripe re-fires `invoice.payment_failed` on each smart-retry attempt.
      // We persist the FIRST failure timestamp on the subscription row and
      // only downgrade once `now() - first_failure >= 3 days` AND the
      // subscription is still in a non-active state.
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string | null;
        log.info(`[${requestId}] === Invoice Payment Failed ===`);
        log.info(`[${requestId}] Invoice ID: ${invoice.id} · Subscription: ${subId}`);

        if (!subId) {
          log.warn(`[${requestId}] payment_failed event has no subscription — skipping`);
          break;
        }

        try {
          let { data: subRow } = await supabase
            .from("subscriptions")
            .select("user_id, payment_failed_at, status, stripe_subscription_id")
            .eq("stripe_subscription_id", subId)
            .maybeSingle();

          // Live Stripe state decides recovery and confirms a real downgrade.
          // A failed lookup is treated as "unconfirmed" — never downgrade on it.
          let liveSub: any = null;
          try {
            liveSub = await withRetry(
              () => stripe.subscriptions.retrieve(subId),
              "Retrieve subscription (payment_failed)",
              requestId
            );
          } catch (lookupErr) {
            log.warn(`[${requestId}] Could not retrieve ${subId} from Stripe:`, lookupErr instanceof Error ? lookupErr.message : String(lookupErr));
          }

          // QNT: self-heal a missing row instead of silently no-op'ing.
          // Root cause (confirmed 2026-07-16 reconciliation): some customers
          // who completed checkout had zero rows in this table, so the grace
          // timer could never persist. Never self-heal over a row the user
          // already has: subscriptions is one row per user, and that row
          // belongs to a different subscription or a manual grant
          // (2026-10-15 fix — this path used to overwrite manual Pro grants).
          if (!subRow && liveSub) {
            const customerId = liveSub.customer as string;
            let userId = liveSub.metadata?.supabase_user_id as string | undefined;
            if (!userId && customerId) {
              const email = await getCustomerEmail(customerId);
              if (email) userId = (await findUserByEmail(email)) ?? undefined;
            }

            if (!userId) {
              log.error(`[${requestId}] Could not resolve user_id for orphaned subscription ${subId} — cannot self-heal. Customer: ${maskEmail(await getCustomerEmail(customerId))}`);
            } else {
              const { data: existing } = await supabase
                .from("subscriptions")
                .select("user_id")
                .eq("user_id", userId)
                .maybeSingle();
              if (!canSelfHealMissingRow(existing)) {
                log.warn(`[${requestId}] User ${userId} already has a subscriptions row not linked to ${subId} — stale event, leaving it untouched`);
              } else {
                const recovered = await upsertSubscription({
                  user_id: userId,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subId,
                  plan_id: planFromSubscription(liveSub) ?? "free",
                  status: "past_due",
                  payment_failed_at: new Date().toISOString(),
                  current_period_start: new Date(liveSub.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(liveSub.current_period_end * 1000).toISOString(),
                });
                if (recovered.success) {
                  log.info(`[${requestId}] Recovered missing subscription row for user ${userId}, sub ${subId}`);
                  subRow = { user_id: userId, payment_failed_at: null, status: "past_due", stripe_subscription_id: subId } as any;
                } else {
                  log.error(`[${requestId}] Failed to recover missing subscription row for sub ${subId}:`, recovered.error);
                }
              }
            }
          }

          if (!subRow) break;

          const nowIso = new Date().toISOString();
          const action = decidePaymentFailed({
            eventSubscriptionId: subId,
            row: subRow as any,
            stripeStatus: liveSub?.status ?? null,
            nowMs: Date.now(),
          });

          switch (action.kind) {
            case "skip_stale":
              log.warn(`[${requestId}] Row no longer linked to ${subId} — stale event, skipping`);
              break;
            case "recovered":
              // Stale or out-of-order failure: Stripe says this subscription is paid.
              await supabase
                .from("subscriptions")
                .update({ payment_failed_at: null, status: liveSub.status })
                .eq("stripe_subscription_id", subId);
              log.info(`[${requestId}] ${subId} is ${liveSub.status} in Stripe — cleared failure marker, no downgrade`);
              break;
            case "start_grace":
              // First failure only — Stripe re-fires this event on every smart retry.
              await supabase
                .from("subscriptions")
                .update({ payment_failed_at: nowIso, status: "past_due" })
                .eq("stripe_subscription_id", subId);
              if (subRow.user_id) {
                await recordServerFunnelEvent("subscription_failed", {
                  userId: subRow.user_id,
                  metadata: { subscription_id: subId },
                });
              }
              log.info(`[${requestId}] First failure for ${subId} — grace window started`);
              break;
            case "in_grace":
              log.info(`[${requestId}] Keeping access (${Math.round(action.ageMs / 3600000)}h since first failure; Stripe status ${liveSub?.status ?? "unknown"})`);
              break;
            case "downgrade": {
              // Canonical downgrade via RPC, scoped to this subscription so it
              // cannot touch a row that has since moved to a grant or new sub.
              const { data: rpcResult, error: rpcErr } = await supabase.rpc("mark_subscription_canceled", {
                p_user_id: subRow.user_id,
                p_reason: "payment_failed_grace_expired",
                p_stripe_subscription_id: subId,
              });
              if (rpcErr) {
                log.error(`[${requestId}] mark_subscription_canceled RPC failed:`, rpcErr.message);
                // Best-effort fallback, also scoped to this subscription.
                await supabase
                  .from("subscriptions")
                  .update({ plan_id: "free", status: "canceled", canceled_at: nowIso })
                  .eq("stripe_subscription_id", subId);
              } else if (rpcResult?.success === false) {
                log.warn(`[${requestId}] Downgrade skipped by RPC: ${rpcResult.error}`);
                break;
              }
              log.info(`[${requestId}] Grace expired (${Math.round(action.ageMs / 86400000)}d) and Stripe status ${liveSub.status} — downgraded ${subId} to FREE`);
              supabase.functions.invoke("send-lifecycle-email", {
                body: {
                  user_id: subRow.user_id,
                  template_key: "payment_failed_downgraded",
                  dynamic_data: {},
                },
              }).catch((err) => log.error(`[${requestId}] downgrade email failed:`, err instanceof Error ? err.message : String(err)));
              break;
            }
          }
        } catch (err) {
          log.error(`[${requestId}] payment_failed handler error:`, err instanceof Error ? err.message : String(err));
        }
        break;
      }

      default:
        log.info(`[${requestId}] Unhandled event type: ${event.type}`);
    }

    log.info(`[${requestId}] === Webhook processing complete ===`);

    // Update webhook event status to processed (with retry)
    try {
      await withRetry(
        async () => {
          const { error } = await supabase
            .from("stripe_webhook_events")
            .update({
              status: "processed",
              processed_at: new Date().toISOString(),
            })
            .eq("event_id", event.id);
          if (error) throw error;
        },
        "Update webhook event status",
        requestId
      );
    } catch (updateErr) {
      log.warn(`[${requestId}] Failed to update webhook event status:`, updateErr);
    }
    
    return new Response(
      JSON.stringify({ received: true, event_type: event.type, request_id: requestId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    log.error(`[${requestId}] Webhook error:`, error);
    // Mark the in-flight event as failed so the next Stripe retry knows to
    // reprocess instead of seeing a stale 'received' row and skipping.
    try {
      const evId = inFlightEventId;
      if (evId) {
        await serviceClient?.from("stripe_webhook_events")
          .update({ status: "failed", error_message: String((error as Error)?.message ?? error).slice(0, 1000) })
          .eq("event_id", evId);
      }
    } catch (markErr) {
      log.warn(`[${requestId}] Could not mark event failed:`, markErr);
    }
    // 5xx → Stripe retries with exponential backoff. We are safe to retry
    // because the idempotency guard above only no-ops on status='processed'.
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)), request_id: requestId }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
