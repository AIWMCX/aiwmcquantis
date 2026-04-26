import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';

log.info("=== Replay Webhook Events Function Started ===");

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  const requestId = crypto.randomUUID().slice(0, 8);
  log.info(`[${requestId}] Replay request received`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    // Verify user is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    
    // Check admin role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.info(`[${requestId}] Admin verified: ${userId}`);

    const body = await req.json();
    const { action, event_ids, stripe_event_id, status_filter } = body;

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Helper functions
    async function findUserByEmail(email: string): Promise<string | null> {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const matchedUser = users?.find(u => u.email === email);
      return matchedUser?.id || null;
    }

    async function getCustomerEmail(customerId: string): Promise<string | null> {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted && customer.email) {
          return customer.email;
        }
      } catch (err) {
        log.error(`[${requestId}] Error fetching customer:`, err.message);
      }
      return null;
    }

    async function processStripeEvent(stripeEventId: string): Promise<{ success: boolean; message: string }> {
      log.info(`[${requestId}] Processing Stripe event: ${stripeEventId}`);
      
      try {
        // Fetch event from Stripe
        const event = await stripe.events.retrieve(stripeEventId);
        log.info(`[${requestId}] Retrieved event type: ${event.type}`);

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          // Resolve user ID
          let userId = session.client_reference_id || (session.metadata as any)?.supabase_user_id;

          if (!userId && session.customer_email) {
            userId = await findUserByEmail(session.customer_email);
          }

          if (!userId && customerId) {
            const customerEmail = await getCustomerEmail(customerId);
            if (customerEmail) {
              userId = await findUserByEmail(customerEmail);
            }
          }

          if (!userId) {
            return { success: false, message: `Could not resolve user ID for event ${stripeEventId}` };
          }

          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          const subscriptionData = {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan_id: "plus",
            status: subscription.status === "trialing" ? "trialing" : "active",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          };

          const { error: upsertError } = await supabase
            .from("subscriptions")
            .upsert(subscriptionData, { onConflict: "user_id" });

          if (upsertError) {
            return { success: false, message: `Upsert failed: ${upsertError.message}` };
          }

          // Update webhook event status
          await supabase
            .from("stripe_webhook_events")
            .update({ status: "replayed", processed_at: new Date().toISOString() })
            .eq("event_id", stripeEventId);

          return { success: true, message: `Subscription synced for user ${userId}` };
        }

        if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
          const subscription = event.data.object as Stripe.Subscription;
          
          const status = event.type === "customer.subscription.deleted" ? "canceled" : 
            subscription.status === "canceled" ? "canceled" :
            subscription.status === "past_due" ? "past_due" :
            subscription.status === "trialing" ? "trialing" : "active";

          const { error } = await supabase
            .from("subscriptions")
            .update({
              plan_id: event.type === "customer.subscription.deleted" ? "free" : "plus",
              status: status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id);

          if (error) {
            // Fallback: find by customer email
            const customerEmail = await getCustomerEmail(subscription.customer as string);
            if (customerEmail) {
              const userId = await findUserByEmail(customerEmail);
              if (userId) {
                await supabase.from("subscriptions").upsert({
                  user_id: userId,
                  stripe_customer_id: subscription.customer as string,
                  stripe_subscription_id: subscription.id,
                  plan_id: event.type === "customer.subscription.deleted" ? "free" : "plus",
                  status: status,
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                }, { onConflict: "user_id" });
              }
            }
          }

          await supabase
            .from("stripe_webhook_events")
            .update({ status: "replayed", processed_at: new Date().toISOString() })
            .eq("event_id", stripeEventId);

          return { success: true, message: `Subscription updated from ${event.type}` };
        }

        return { success: false, message: `Unsupported event type: ${event.type}` };
      } catch (err) {
        log.error(`[${requestId}] Error processing event:`, err);
        return { success: false, message: err.message };
      }
    }

    // Handle different actions
    switch (action) {
      case "list_failed": {
        // List failed webhook events
        const { data: failedEvents, error } = await supabase
          .from("stripe_webhook_events")
          .select("*")
          .in("status", status_filter || ["received", "processing", "failed"])
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        return new Response(
          JSON.stringify({ events: failedEvents }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      case "replay_single": {
        if (!stripe_event_id) {
          return new Response(
            JSON.stringify({ error: "stripe_event_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const result = await processStripeEvent(stripe_event_id);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: result.success ? 200 : 400 }
        );
      }

      case "replay_batch": {
        if (!event_ids || !Array.isArray(event_ids)) {
          return new Response(
            JSON.stringify({ error: "event_ids array required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const results = [];
        for (const eventId of event_ids.slice(0, 10)) { // Max 10 at a time
          const result = await processStripeEvent(eventId);
          results.push({ event_id: eventId, ...result });
        }

        return new Response(
          JSON.stringify({ results }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      case "sync_from_stripe": {
        // Sync subscription directly from Stripe customer email
        const { email } = body;
        if (!email) {
          return new Response(
            JSON.stringify({ error: "email required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        log.info(`[${requestId}] Syncing subscription for email: ${email}`);

        // Find user
        const userId = await findUserByEmail(email);
        if (!userId) {
          return new Response(
            JSON.stringify({ error: `No user found for email: ${email}` }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Find customer in Stripe
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (!customers.data.length) {
          return new Response(
            JSON.stringify({ error: `No Stripe customer found for email: ${email}` }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const customer = customers.data[0];
        
        // Get active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 1,
        });

        if (!subscriptions.data.length) {
          return new Response(
            JSON.stringify({ error: `No subscriptions found for customer: ${customer.id}` }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const subscription = subscriptions.data[0];

        const subscriptionData = {
          user_id: userId,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          plan_id: subscription.status === "canceled" ? "free" : "plus",
          status: subscription.status === "trialing" ? "trialing" : 
                  subscription.status === "active" ? "active" : 
                  subscription.status === "canceled" ? "canceled" : subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        };

        const { error: upsertError } = await supabase
          .from("subscriptions")
          .upsert(subscriptionData, { onConflict: "user_id" });

        if (upsertError) {
          return new Response(
            JSON.stringify({ error: `Upsert failed: ${upsertError.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Subscription synced for ${email}`,
            subscription: subscriptionData
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: "Invalid action",
            available_actions: ["list_failed", "replay_single", "replay_batch", "sync_from_stripe"]
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    log.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
