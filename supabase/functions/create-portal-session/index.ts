import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Security headers for all responses
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
};

// CORS configuration - tightened for production
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    "https://aiwmcquantis.com",
    "https://www.aiwmcquantis.com",
  ];
  
  // Only permit exact production domains
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...securityHeaders,
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;

    console.log(`Creating portal session for user: ${userEmail}`);

    // Get user's subscription to find their Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) {
      throw new Error("Error fetching subscription");
    }

    let customerId = subscription?.stripe_customer_id;

    // If no customer ID in DB, try to find by email in Stripe
    if (!customerId) {
      console.log(`No customer ID in DB, searching Stripe by email: ${userEmail}`);
      const customers = await stripe.customers.list({
        email: userEmail!,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log(`Found Stripe customer: ${customerId}`);
        
        // Update the subscription record with the found customer ID
        if (subscription) {
          await supabase
            .from("subscriptions")
            .update({ stripe_customer_id: customerId })
            .eq("user_id", userId);
          console.log(`Updated subscription with Stripe customer ID`);
        }
      }
    }

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: "No Stripe customer found. Please subscribe first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create portal session
    const returnOrigin = origin || "https://aiwmcquantis.com";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${returnOrigin}/app`,
    });

    console.log(`Portal session created: ${portalSession.id}`);

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Portal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

