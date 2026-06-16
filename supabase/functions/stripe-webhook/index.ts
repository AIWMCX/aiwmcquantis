import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { maybeHealthResponse } from '../_shared/health.ts';

const FUNCTION_NAME = 'stripe-webhook';
const FUNCTION_VERSION = '1.0.0';

const log = createLogger('stripe-webhook', 'module');


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

    // ATOMIC EVENT LOGGING - Log BEFORE processing starts (critical for audit trail)
    // This ensures we have a record even if processing crashes
    let webhookEventLogged = false;
    try {
      await withRetry(
        async () => {
          const { error } = await supabase
            .from("stripe_webhook_events")
            .insert({
              event_id: event.id,
              event_type: event.type,
              customer_id: (event.data.object as any)?.customer || null,
              status: "received", // Mark as received, not processing yet
              payload: event.data.object as any,
            });
          if (error) throw error;
        },
        "Log webhook event (atomic)",
        requestId
      );
      webhookEventLogged = true;
      log.info(`[${requestId}] ✓ Webhook event logged atomically BEFORE processing`);
    } catch (logErr) {
      log.error(`[${requestId}] ⚠️ CRITICAL: Failed to log webhook event - continuing anyway:`, logErr);
      // Continue processing even if logging fails, but log prominently
    }

    // Update status to processing
    if (webhookEventLogged) {
      try {
        await supabase
          .from("stripe_webhook_events")
          .update({ status: "processing" })
          .eq("event_id", event.id);
      } catch (e) {
        log.warn(`[${requestId}] Could not update status to processing`);
      }
    }

    // Helper function to find user by email (with retry)
    async function findUserByEmail(email: string): Promise<string | null> {
      log.info(`[${requestId}] Looking up user by email: ${email}`);
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
            log.info(`[${requestId}] No user found for email: ${email}`);
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
              log.info(`[${requestId}] Customer email from Stripe: ${customer.email}`);
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
    const PRO_PRICE_IDS = new Set<string>(
      [
        Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID"),
        Deno.env.get("STRIPE_PRO_ANNUAL_PRICE_ID"),
      ].filter(Boolean) as string[]
    );

    function planFromSubscription(sub: Stripe.Subscription): "plus" | "pro" {
      const priceId = sub.items?.data?.[0]?.price?.id;
      if (priceId && PRO_PRICE_IDS.has(priceId)) {
        return "pro";
      }
      return "plus"; // default for legacy + Plus prices
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        log.info(`[${requestId}] === Checkout Session Completed ===`);
        log.info(`[${requestId}] Session ID: ${session.id}`);
        log.info(`[${requestId}] Client Reference ID: ${session.client_reference_id}`);
        log.info(`[${requestId}] Session metadata: ${JSON.stringify(session.metadata)}`);
        log.info(`[${requestId}] Customer: ${session.customer}`);
        log.info(`[${requestId}] Customer Email: ${session.customer_email}`);
        log.info(`[${requestId}] Subscription: ${session.subscription}`);

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
          log.error(`[${requestId}] customer_email: ${session.customer_email}`);
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
        log.info(`[${requestId}] Determined plan: ${plan} (price: ${(subscription as any).items?.data?.[0]?.price?.id})`);

        // Map status
        let status = "active";
        if ((subscription as any).status === "trialing") {
          status = "trialing";
        }
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
        };
        log.info(`[${requestId}] Subscription data:`, JSON.stringify(subscriptionData));

        const result = await upsertSubscription(subscriptionData);
        if (result.success) {
          log.info(`[${requestId}] SUCCESS: Subscription created for user ${userId}, plan: ${plan}`);

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

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        log.info(`[${requestId}] === Subscription Updated ===`);
        log.info(`[${requestId}] Subscription ID: ${(subscription as any).id}`);
        log.info(`[${requestId}] Status: ${(subscription as any).status}`);
        log.info(`[${requestId}] Customer: ${(subscription as any).customer}`);

        // Map Stripe Price ID → correct plan (plus or pro)
        const plan = planFromSubscription(subscription);

        let status = "active";
        if ((subscription as any).status === "canceled") {
          status = "canceled";
        } else if ((subscription as any).status === "past_due") {
          status = "past_due";
        } else if ((subscription as any).status === "trialing") {
          status = "trialing";
        }

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
                  })
                  .eq("stripe_subscription_id", (subscription as any).id);
                if (error) throw error;
              },
              "Update subscription by ID",
              requestId
            );
            log.info(`[${requestId}] SUCCESS: Subscription updated by subscription_id`);

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
                });
                if (result.success) {
                  log.info(`[${requestId}] SUCCESS: Subscription upserted via email fallback for user ${userId}`);
                } else {
                  log.error(`[${requestId}] Upsert fallback error:`, result.error);
                }
              } else {
                log.error(`[${requestId}] Could not find user for email ${customerEmail}`);
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
              });
              log.info(`[${requestId}] mark_subscription_canceled OK for ${subRow.user_id}`);
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
                });
                if (result.success) {
                  log.info(`[${requestId}] ✓ Subscription synced via invoice.paid email fallback for user ${userId}`);
                } else {
                  log.error(`[${requestId}] Invoice upsert fallback error:`, result.error);
                }
              } else {
                log.error(`[${requestId}] CRITICAL: Paid invoice but cannot find user for email ${customerEmail}`);
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
          const { data: subRow } = await supabase
            .from("subscriptions")
            .select("user_id, payment_failed_at, status")
            .eq("stripe_subscription_id", subId)
            .maybeSingle();

          const nowIso = new Date().toISOString();
          const firstFailureIso = subRow?.payment_failed_at ?? nowIso;

          // Always record (or refresh) the first failure timestamp + flag the
          // status. If this is the first failure we set payment_failed_at=now;
          // subsequent failures keep the original timestamp so the grace
          // window doesn't reset on every retry.
          if (!subRow?.payment_failed_at) {
            await supabase
              .from("subscriptions")
              .update({ payment_failed_at: nowIso, status: "past_due" })
              .eq("stripe_subscription_id", subId);
          }

          const ageMs = Date.now() - new Date(firstFailureIso).getTime();
          const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

          if (ageMs >= GRACE_MS) {
            // Grace expired — canonical downgrade via RPC: flips plan_id='free',
            // status='canceled', sets history_readonly_until = now()+30d, and
            // writes a subscription_audit_log entry.
            if (subRow?.user_id) {
              try {
                await supabase.rpc("mark_subscription_canceled", {
                  p_user_id: subRow.user_id,
                  p_reason: "payment_failed_grace_expired",
                });
                log.info(`[${requestId}] Grace expired (${Math.round(ageMs / 86400000)}d) — downgraded ${subId} to FREE via RPC`);
              } catch (rpcErr) {
                log.error(`[${requestId}] mark_subscription_canceled RPC failed:`, rpcErr instanceof Error ? rpcErr.message : String(rpcErr));
                // Best-effort fallback: direct update so at least entitlement is revoked.
                await supabase
                  .from("subscriptions")
                  .update({ plan_id: "free", status: "canceled", canceled_at: nowIso })
                  .eq("stripe_subscription_id", subId);
              }

              supabase.functions.invoke("send-lifecycle-email", {
                body: {
                  user_id: subRow.user_id,
                  template_key: "payment_failed_downgraded",
                  dynamic_data: {},
                },
              }).catch((err) => log.error(`[${requestId}] downgrade email failed:`, err instanceof Error ? err.message : String(err)));
            } else {
              log.warn(`[${requestId}] Grace expired but no user_id resolved — skipping RPC downgrade`);
            }
          } else {
            log.info(`[${requestId}] Within grace window (${Math.round(ageMs / 3600000)}h / 72h) — keeping access`);
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
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
