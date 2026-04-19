import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Security headers for all responses
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  ...securityHeaders,
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
      lastError = error;
      
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = calculateBackoff(attempt);
        console.warn(`[${requestId}] ${operationName} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}), retrying in ${delay}ms:`, error.message);
        await sleep(delay);
      }
    }
  }
  
  console.error(`[${requestId}] ${operationName} failed after ${RETRY_CONFIG.maxRetries + 1} attempts`);
  throw lastError;
}

console.log("=== Stripe Webhook Function Started ===");
console.log("Timestamp:", new Date().toISOString());

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] === Stripe Webhook Request ===`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint - useful for testing if function is deployed
  if (req.method === "GET") {
    console.log(`[${requestId}] Health check request`);
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
    
    console.log(`[${requestId}] Stripe Secret Key configured: ${!!stripeSecretKey}`);
    console.log(`[${requestId}] Webhook Secret configured: ${!!webhookSecret}`);
    
    if (!stripeSecretKey || !webhookSecret) {
      console.error(`[${requestId}] Missing Stripe configuration`);
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

    console.log(`[${requestId}] Body length: ${body.length}`);
    console.log(`[${requestId}] Signature present: ${!!signature}`);

    if (!signature) {
      console.error(`[${requestId}] No Stripe signature in headers`);
      return new Response(
        JSON.stringify({ error: "No Stripe signature found" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify webhook signature - MUST use async version for Deno
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log(`[${requestId}] Signature verified successfully`);
    } catch (err) {
      console.error(`[${requestId}] Signature verification failed:`, err.message);
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed", details: err.message }),
        { status: 401, headers: corsHeaders }
      );
    }

    console.log(`[${requestId}] Event type: ${event.type}`);
    console.log(`[${requestId}] Event ID: ${event.id}`);

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
      console.log(`[${requestId}] ✓ Webhook event logged atomically BEFORE processing`);
    } catch (logErr) {
      console.error(`[${requestId}] ⚠️ CRITICAL: Failed to log webhook event - continuing anyway:`, logErr);
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
        console.warn(`[${requestId}] Could not update status to processing`);
      }
    }

    // Helper function to find user by email (with retry)
    async function findUserByEmail(email: string): Promise<string | null> {
      console.log(`[${requestId}] Looking up user by email: ${email}`);
      try {
        return await withRetry(
          async () => {
            const { data: { users }, error } = await supabase.auth.admin.listUsers();
            if (error) throw error;
            const matchedUser = users?.find(u => u.email === email);
            if (matchedUser) {
              console.log(`[${requestId}] Found user by email: ${matchedUser.id}`);
              return matchedUser.id;
            }
            console.log(`[${requestId}] No user found for email: ${email}`);
            return null;
          },
          "Find user by email",
          requestId
        );
      } catch (err) {
        console.error(`[${requestId}] Error finding user by email:`, err.message);
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
              console.log(`[${requestId}] Customer email from Stripe: ${customer.email}`);
              return customer.email;
            }
            return null;
          },
          "Get customer email",
          requestId
        );
      } catch (err) {
        console.error(`[${requestId}] Error fetching customer:`, err.message);
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
        console.log(`[${requestId}] Upsert failed, attempting INSERT fallback...`);
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
        console.log(`[${requestId}] === Checkout Session Completed ===`);
        console.log(`[${requestId}] Session ID: ${session.id}`);
        console.log(`[${requestId}] Client Reference ID: ${session.client_reference_id}`);
        console.log(`[${requestId}] Session metadata: ${JSON.stringify(session.metadata)}`);
        console.log(`[${requestId}] Customer: ${session.customer}`);
        console.log(`[${requestId}] Customer Email: ${session.customer_email}`);
        console.log(`[${requestId}] Subscription: ${session.subscription}`);

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
          console.error(`[${requestId}] NO USER ID FOUND - cannot create subscription`);
          console.error(`[${requestId}] client_reference_id: ${session.client_reference_id}`);
          console.error(`[${requestId}] metadata: ${JSON.stringify(session.metadata)}`);
          console.error(`[${requestId}] customer_email: ${session.customer_email}`);
          break;
        }

        console.log(`[${requestId}] User ID resolved: ${userId}`);

        // Get subscription details from Stripe (with retry)
        console.log(`[${requestId}] Fetching subscription details...`);
        const subscription = await withRetry(
          () => stripe.subscriptions.retrieve(subscriptionId),
          "Retrieve subscription",
          requestId
        );
        console.log(`[${requestId}] Subscription status: ${subscription.status}`);

        // All paid subscriptions are now 'plus' (Pro tier removed)
        const plan = "plus";
        console.log(`[${requestId}] Determined plan: ${plan} (Pro tier has been removed)`);

        // Map status
        let status = "active";
        if (subscription.status === "trialing") {
          status = "trialing";
        }
        console.log(`[${requestId}] Status: ${status}`);

        // Upsert subscription with retry
        console.log(`[${requestId}] Upserting subscription to database...`);
        const subscriptionData = {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan_id: plan,
          status: status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        };
        console.log(`[${requestId}] Subscription data:`, JSON.stringify(subscriptionData));

        const result = await upsertSubscription(subscriptionData);
        if (result.success) {
          console.log(`[${requestId}] SUCCESS: Subscription created for user ${userId}, plan: ${plan}`);
        } else {
          console.error(`[${requestId}] FAILED to create subscription:`, result.error);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[${requestId}] === Subscription Updated ===`);
        console.log(`[${requestId}] Subscription ID: ${subscription.id}`);
        console.log(`[${requestId}] Status: ${subscription.status}`);
        console.log(`[${requestId}] Customer: ${subscription.customer}`);

        // All paid subscriptions are now 'plus' (Pro tier removed)
        const plan = "plus";

        let status = "active";
        if (subscription.status === "canceled") {
          status = "canceled";
        } else if (subscription.status === "past_due") {
          status = "past_due";
        } else if (subscription.status === "trialing") {
          status = "trialing";
        }

        console.log(`[${requestId}] Updating - Plan: ${plan}, Status: ${status}`);

        // First, try to update by subscription ID (with retry)
        try {
          const existing = await withRetry(
            async () => {
              const { data, error } = await supabase
                .from("subscriptions")
                .select("id, user_id")
                .eq("stripe_subscription_id", subscription.id)
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
                    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  })
                  .eq("stripe_subscription_id", subscription.id);
                if (error) throw error;
              },
              "Update subscription by ID",
              requestId
            );
            console.log(`[${requestId}] SUCCESS: Subscription updated by subscription_id`);
          } else {
            // Fallback: Find user by customer email and upsert
            console.log(`[${requestId}] Subscription not found by ID, attempting email fallback...`);
            const customerEmail = await getCustomerEmail(subscription.customer as string);
            if (customerEmail) {
              const userId = await findUserByEmail(customerEmail);
              if (userId) {
                const result = await upsertSubscription({
                  user_id: userId,
                  stripe_customer_id: subscription.customer as string,
                  stripe_subscription_id: subscription.id,
                  plan_id: plan,
                  status: status,
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                });
                if (result.success) {
                  console.log(`[${requestId}] SUCCESS: Subscription upserted via email fallback for user ${userId}`);
                } else {
                  console.error(`[${requestId}] Upsert fallback error:`, result.error);
                }
              } else {
                console.error(`[${requestId}] Could not find user for email ${customerEmail}`);
              }
            } else {
              console.error(`[${requestId}] Could not get customer email for fallback`);
            }
          }
        } catch (err) {
          console.error(`[${requestId}] Subscription update failed:`, err.message);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[${requestId}] === Subscription Deleted ===`);
        console.log(`[${requestId}] Subscription ID: ${subscription.id}`);
        console.log(`[${requestId}] Customer: ${subscription.customer}`);
        console.log(`[${requestId}] Cancel reason: ${subscription.cancellation_details?.reason || 'unknown'}`);
        console.log(`[${requestId}] Canceled at: ${subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : 'N/A'}`);

        // PROTECTION: Before canceling, verify with Stripe that subscription is truly canceled
        // and check if there's an active replacement subscription
        try {
          const customerId = subscription.customer as string;
          console.log(`[${requestId}] Checking for active subscriptions for customer ${customerId}...`);
          
          const activeSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 5,
          });

          if (activeSubscriptions.data.length > 0) {
            console.log(`[${requestId}] ⚠️ Customer has ${activeSubscriptions.data.length} active subscription(s) - NOT downgrading to free`);
            console.log(`[${requestId}] Active subscription IDs: ${activeSubscriptions.data.map(s => s.id).join(', ')}`);
            // Don't cancel - customer has another active subscription
            break;
          }

          console.log(`[${requestId}] No active subscriptions found - proceeding with cancellation`);

          await withRetry(
            async () => {
              const { error } = await supabase
                .from("subscriptions")
                .update({
                  plan_id: "free",
                  status: "canceled",
                })
                .eq("stripe_subscription_id", subscription.id);
              if (error) throw error;
            },
            "Cancel subscription",
            requestId
          );
          console.log(`[${requestId}] SUCCESS: Subscription canceled (verified no active replacements)`);
        } catch (err) {
          console.error(`[${requestId}] Delete error:`, err.message);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[${requestId}] === Invoice Paid ===`);
        console.log(`[${requestId}] Invoice ID: ${invoice.id}`);
        console.log(`[${requestId}] Subscription: ${invoice.subscription}`);
        console.log(`[${requestId}] Customer: ${invoice.customer}`);
        console.log(`[${requestId}] Amount Paid: ${invoice.amount_paid / 100} ${invoice.currency?.toUpperCase()}`);
        console.log(`[${requestId}] Billing Reason: ${invoice.billing_reason}`);

        // CRITICAL: invoice.paid is the STRONGEST signal of an active subscription
        // If payment succeeded, user MUST have Plus access regardless of other events
        if (invoice.subscription && invoice.customer && invoice.amount_paid > 0) {
          // Fetch full subscription to sync data (with retry)
          const subscription = await withRetry(
            () => stripe.subscriptions.retrieve(invoice.subscription as string),
            "Retrieve subscription for invoice",
            requestId
          );
          
          // All paid subscriptions are now 'plus' (Pro tier removed)
          const plan = "plus";
          const status = subscription.status === "active" || subscription.status === "trialing" ? "active" : subscription.status;

          console.log(`[${requestId}] 💰 PAID INVOICE - Ensuring Plus access for subscription ${subscription.id}`);
          console.log(`[${requestId}] Stripe subscription status: ${subscription.status}`);

          // Try to update by subscription ID first
          let updated = false;
          try {
            const { data, error } = await supabase
              .from("subscriptions")
              .update({
                plan_id: plan,
                status: status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              })
              .eq("stripe_subscription_id", subscription.id)
              .select();
              
            if (!error && data && data.length > 0) {
              updated = true;
              console.log(`[${requestId}] ✓ Subscription updated from invoice.paid by subscription_id`);
            }
          } catch (err) {
            console.log(`[${requestId}] Could not update by subscription_id, trying fallback...`);
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
                  stripe_subscription_id: subscription.id,
                  plan_id: plan,
                  status: status,
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                });
                if (result.success) {
                  console.log(`[${requestId}] ✓ Subscription synced via invoice.paid email fallback for user ${userId}`);
                } else {
                  console.error(`[${requestId}] Invoice upsert fallback error:`, result.error);
                }
              } else {
                console.error(`[${requestId}] CRITICAL: Paid invoice but cannot find user for email ${customerEmail}`);
              }
            } else {
              console.error(`[${requestId}] CRITICAL: Paid invoice but cannot get customer email`);
            }
          }
        } else if (invoice.amount_paid === 0) {
          console.log(`[${requestId}] Skipping $0 invoice (likely trial or proration)`);
        }
        break;
      }

      default:
        console.log(`[${requestId}] Unhandled event type: ${event.type}`);
    }

    console.log(`[${requestId}] === Webhook processing complete ===`);

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
      console.warn(`[${requestId}] Failed to update webhook event status:`, updateErr);
    }
    
    return new Response(
      JSON.stringify({ received: true, event_type: event.type, request_id: requestId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Webhook error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
