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

    // Helper function to find user by email
    async function findUserByEmail(email: string): Promise<string | null> {
      console.log(`[${requestId}] Looking up user by email: ${email}`);
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (error) {
        console.error(`[${requestId}] Error listing users:`, error.message);
        return null;
      }
      const matchedUser = users?.find(u => u.email === email);
      if (matchedUser) {
        console.log(`[${requestId}] Found user by email: ${matchedUser.id}`);
        return matchedUser.id;
      }
      console.log(`[${requestId}] No user found for email: ${email}`);
      return null;
    }

    // Helper function to get customer email from Stripe
    async function getCustomerEmail(customerId: string): Promise<string | null> {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted && customer.email) {
          console.log(`[${requestId}] Customer email from Stripe: ${customer.email}`);
          return customer.email;
        }
      } catch (err) {
        console.error(`[${requestId}] Error fetching customer:`, err.message);
      }
      return null;
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
        console.log(`[${requestId}] Customer: ${subscription.customer}`);

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

        // First, try to update by subscription ID
        const { data: existingBySubId, error: selectError } = await supabase
          .from("subscriptions")
          .select("id, user_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (existingBySubId) {
          // Found by subscription ID - update it
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
            console.log(`[${requestId}] SUCCESS: Subscription updated by subscription_id`);
          }
        } else {
          // Fallback: Find user by customer email and upsert
          console.log(`[${requestId}] Subscription not found by ID, attempting email fallback...`);
          const customerEmail = await getCustomerEmail(subscription.customer as string);
          if (customerEmail) {
            const userId = await findUserByEmail(customerEmail);
            if (userId) {
              const { error: upsertError } = await supabase
                .from("subscriptions")
                .upsert({
                  user_id: userId,
                  stripe_customer_id: subscription.customer as string,
                  stripe_subscription_id: subscription.id,
                  plan_id: plan,
                  status: status,
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                }, { onConflict: "user_id" });

              if (upsertError) {
                console.error(`[${requestId}] Upsert fallback error:`, upsertError);
              } else {
                console.log(`[${requestId}] SUCCESS: Subscription upserted via email fallback for user ${userId}`);
              }
            } else {
              console.error(`[${requestId}] Could not find user for email ${customerEmail}`);
            }
          } else {
            console.error(`[${requestId}] Could not get customer email for fallback`);
          }
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

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[${requestId}] === Invoice Paid ===`);
        console.log(`[${requestId}] Invoice ID: ${invoice.id}`);
        console.log(`[${requestId}] Subscription: ${invoice.subscription}`);
        console.log(`[${requestId}] Customer: ${invoice.customer}`);

        if (invoice.subscription && invoice.customer) {
          // Fetch full subscription to sync data
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          const plusPriceId = Deno.env.get("STRIPE_PLUS_PRICE_ID");
          const proPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
          const priceId = subscription.items.data[0]?.price.id;
          
          let plan = "plus";
          if (priceId === proPriceId) {
            plan = "pro";
          }

          // Update subscription period dates
          const { error: updateError } = await supabase
            .from("subscriptions")
            .update({
              plan_id: plan,
              status: subscription.status === "active" ? "active" : subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id);

          if (updateError) {
            console.error(`[${requestId}] Invoice update error:`, updateError);
            
            // Fallback: try to find by customer email
            const customerEmail = await getCustomerEmail(invoice.customer as string);
            if (customerEmail) {
              const userId = await findUserByEmail(customerEmail);
              if (userId) {
                const { error: upsertError } = await supabase
                  .from("subscriptions")
                  .upsert({
                    user_id: userId,
                    stripe_customer_id: invoice.customer as string,
                    stripe_subscription_id: subscription.id,
                    plan_id: plan,
                    status: subscription.status === "active" ? "active" : subscription.status,
                    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  }, { onConflict: "user_id" });

                if (upsertError) {
                  console.error(`[${requestId}] Invoice upsert fallback error:`, upsertError);
                } else {
                  console.log(`[${requestId}] SUCCESS: Subscription synced via invoice.paid fallback`);
                }
              }
            }
          } else {
            console.log(`[${requestId}] SUCCESS: Subscription updated from invoice.paid`);
          }
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
