import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("=== Stripe Webhook Function Started ===");
console.log("Timestamp:", new Date().toISOString());

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] === Stripe Webhook Request ===`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
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
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
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
      throw new Error("No Stripe signature found");
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`[${requestId}] Signature verified successfully`);
    } catch (err) {
      console.error(`[${requestId}] Signature verification failed:`, err.message);
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed", details: err.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[${requestId}] Event type: ${event.type}`);
    console.log(`[${requestId}] Event ID: ${event.id}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[${requestId}] === Checkout Session Completed ===`);
        console.log(`[${requestId}] Session ID: ${session.id}`);
        console.log(`[${requestId}] Client Reference ID: ${session.client_reference_id}`);
        console.log(`[${requestId}] Session metadata: ${JSON.stringify(session.metadata)}`);
        console.log(`[${requestId}] Customer: ${session.customer}`);
        console.log(`[${requestId}] Subscription: ${session.subscription}`);

        // Payment Links use client_reference_id, API checkout uses metadata
        const userId = session.client_reference_id || session.metadata?.supabase_user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error(`[${requestId}] NO USER ID FOUND - cannot create subscription`);
          console.error(`[${requestId}] client_reference_id: ${session.client_reference_id}`);
          console.error(`[${requestId}] metadata: ${JSON.stringify(session.metadata)}`);
          break;
        }

        console.log(`[${requestId}] User ID resolved: ${userId}`);

        // Get subscription details from Stripe
        console.log(`[${requestId}] Fetching subscription details...`);
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log(`[${requestId}] Subscription status: ${subscription.status}`);

        // Get line items to determine plan
        console.log(`[${requestId}] Fetching line items...`);
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;
        
        const plusPriceId = Deno.env.get("STRIPE_PLUS_PRICE_ID");
        const proPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
        
        console.log(`[${requestId}] Price ID from checkout: ${priceId}`);
        console.log(`[${requestId}] Plus Price ID (env): ${plusPriceId}`);
        console.log(`[${requestId}] Pro Price ID (env): ${proPriceId}`);
        
        let plan = "plus"; // Default to plus
        if (priceId === proPriceId) {
          plan = "pro";
        }
        console.log(`[${requestId}] Determined plan: ${plan}`);

        // Map status
        let status = "active";
        if (subscription.status === "trialing") {
          status = "trialing";
        }
        console.log(`[${requestId}] Status: ${status}`);

        // Upsert subscription
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

        const { data: upsertData, error: upsertError } = await supabase
          .from("subscriptions")
          .upsert(subscriptionData, { onConflict: "user_id" });

        if (upsertError) {
          console.error(`[${requestId}] UPSERT FAILED:`, JSON.stringify(upsertError));
          
          // Fallback: try INSERT
          console.log(`[${requestId}] Attempting fallback INSERT...`);
          const { error: insertError } = await supabase
            .from("subscriptions")
            .insert(subscriptionData);
          
          if (insertError) {
            console.error(`[${requestId}] INSERT FALLBACK FAILED:`, JSON.stringify(insertError));
          } else {
            console.log(`[${requestId}] SUCCESS via INSERT fallback`);
          }
        } else {
          console.log(`[${requestId}] SUCCESS: Subscription created for user ${userId}, plan: ${plan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[${requestId}] === Subscription Updated ===`);
        console.log(`[${requestId}] Subscription ID: ${subscription.id}`);
        console.log(`[${requestId}] Status: ${subscription.status}`);

        const plusPriceId = Deno.env.get("STRIPE_PLUS_PRICE_ID");
        const proPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
        const priceId = subscription.items.data[0]?.price.id;
        
        let plan = "plus";
        if (priceId === proPriceId) {
          plan = "pro";
        }

        let status = "active";
        if (subscription.status === "canceled") {
          status = "canceled";
        } else if (subscription.status === "past_due") {
          status = "past_due";
        } else if (subscription.status === "trialing") {
          status = "trialing";
        }

        console.log(`[${requestId}] Updating - Plan: ${plan}, Status: ${status}`);

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            plan_id: plan,
            status: status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          console.error(`[${requestId}] Update error:`, updateError);
        } else {
          console.log(`[${requestId}] SUCCESS: Subscription updated`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[${requestId}] === Subscription Deleted ===`);
        console.log(`[${requestId}] Subscription ID: ${subscription.id}`);

        const { error: deleteError } = await supabase
          .from("subscriptions")
          .update({
            plan_id: "free",
            status: "canceled",
          })
          .eq("stripe_subscription_id", subscription.id);

        if (deleteError) {
          console.error(`[${requestId}] Delete error:`, deleteError);
        } else {
          console.log(`[${requestId}] SUCCESS: Subscription canceled`);
        }
        break;
      }

      default:
        console.log(`[${requestId}] Unhandled event type: ${event.type}`);
    }

    console.log(`[${requestId}] === Webhook processing complete ===`);
    
    return new Response(
      JSON.stringify({ received: true, event_type: event.type, request_id: requestId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`[${requestId}] === Webhook Error ===`);
    console.error(`[${requestId}] Error:`, error.message);
    
    return new Response(
      JSON.stringify({ error: error.message, request_id: requestId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
