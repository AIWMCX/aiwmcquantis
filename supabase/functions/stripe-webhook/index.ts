import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== Stripe Webhook Request Received ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    console.log("Stripe Secret Key configured:", !!stripeSecretKey);
    console.log("Webhook Secret configured:", !!webhookSecret);
    
    if (!stripeSecretKey || !webhookSecret) {
      console.error("Missing Stripe configuration");
      throw new Error("Stripe keys not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw body and signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    console.log("Request body length:", body.length);
    console.log("Stripe signature present:", !!signature);

    if (!signature) {
      console.error("No Stripe signature in request headers");
      throw new Error("No Stripe signature found");
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log("Webhook signature verified successfully");
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed", details: err.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Processing webhook event: ${event.type}`);
    console.log("Event ID:", event.id);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("=== Checkout Session Completed ===");
        console.log("Session ID:", session.id);
        console.log("Session metadata:", JSON.stringify(session.metadata));
        console.log("Customer:", session.customer);
        console.log("Subscription:", session.subscription);

        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan || "plus";
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error("No user ID in session metadata - cannot create subscription");
          break;
        }

        // Get subscription details from Stripe
        console.log("Fetching subscription details from Stripe...");
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log("Subscription status:", subscription.status);
        console.log("Current period start:", new Date(subscription.current_period_start * 1000).toISOString());
        console.log("Current period end:", new Date(subscription.current_period_end * 1000).toISOString());

        // Upsert subscription in database
        console.log("Upserting subscription to database...");
        const { data: upsertData, error: upsertError } = await supabase
          .from("subscriptions")
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan_id: plan,
            status: subscription.status === "active" ? "active" : "trialing",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }, {
            onConflict: "user_id",
          });

        if (upsertError) {
          console.error("UPSERT FAILED - Detailed error:", JSON.stringify(upsertError));
          console.error("Error code:", upsertError.code);
          console.error("Error hint:", upsertError.hint);
          console.error("Error details:", upsertError.details);
          
          // Fallback: try direct INSERT if upsert fails
          console.log("Attempting fallback INSERT...");
          const { error: insertError } = await supabase
            .from("subscriptions")
            .insert({
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              plan_id: plan,
              status: subscription.status === "active" ? "active" : "trialing",
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            });
          
          if (insertError) {
            console.error("INSERT FALLBACK ALSO FAILED:", JSON.stringify(insertError));
          } else {
            console.log("SUCCESS via INSERT fallback for user:", userId);
          }
        } else {
          console.log(`SUCCESS: Subscription upserted for user ${userId}, plan: ${plan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("=== Subscription Updated ===");
        console.log("Subscription ID:", subscription.id);
        console.log("Status:", subscription.status);

        // Determine plan from price
        const plusPriceId = Deno.env.get("STRIPE_PLUS_PRICE_ID");
        const proPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
        const priceId = subscription.items.data[0]?.price.id;
        
        console.log("Price ID:", priceId);
        console.log("Plus Price ID:", plusPriceId);
        console.log("Pro Price ID:", proPriceId);
        
        let plan = "plus";
        if (priceId === proPriceId) {
          plan = "pro";
        } else if (priceId === plusPriceId) {
          plan = "plus";
        }

        // Map Stripe status to our status
        let status = "active";
        if (subscription.status === "canceled") {
          status = "canceled";
        } else if (subscription.status === "past_due") {
          status = "past_due";
        } else if (subscription.status === "trialing") {
          status = "trialing";
        }

        console.log("Updating subscription - Plan:", plan, "Status:", status);

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
          console.error("Error updating subscription:", updateError);
        } else {
          console.log(`SUCCESS: Subscription ${subscription.id} updated to ${plan} (${status})`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("=== Subscription Deleted ===");
        console.log("Subscription ID:", subscription.id);

        // Update subscription to free/canceled
        const { error: deleteError } = await supabase
          .from("subscriptions")
          .update({
            plan_id: "free",
            status: "canceled",
          })
          .eq("stripe_subscription_id", subscription.id);

        if (deleteError) {
          console.error("Error updating canceled subscription:", deleteError);
        } else {
          console.log(`SUCCESS: Subscription ${subscription.id} marked as canceled`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    console.log("=== Webhook processing complete ===");
    
    return new Response(
      JSON.stringify({ received: true, event_type: event.type }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("=== Webhook Error ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
