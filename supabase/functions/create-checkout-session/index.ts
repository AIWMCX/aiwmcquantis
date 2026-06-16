import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'create-checkout-session';
const FUNCTION_VERSION = '1.0.0';

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
    "http://localhost:5173",
    "http://localhost:8080",
  ];
  
  // Also allow Lovable preview domains
  const isLovablePreview = origin?.includes(".lovable.app") || origin?.includes(".lovable.dev") || origin?.includes(".lovableproject.com");
  const isAllowed = origin && (allowedOrigins.includes(origin) || isLovablePreview);
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...securityHeaders,
  };
}

serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger('create-checkout-session', reqId);

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
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
    // Validate content type
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const userEmail = user.email;

    const { plan } = await req.json();
    log.info(`Creating checkout session for plan: ${plan}, user: ${userEmail}`);

    // Spec §11.3 — accept 'plus' (no trial) and 'pro' (14-day trial). The
    // Pro price ID is optional: if STRIPE_PRO_PRICE_ID is unset we reject the
    // request rather than silently fall back to Plus pricing.
    if (plan !== 'plus' && plan !== 'pro') {
      log.warn(`Invalid plan requested: ${plan}`);
      return new Response(
        JSON.stringify({
          error: "Invalid plan. Allowed: 'plus' or 'pro'.",
          valid_plans: ['plus', 'pro'],
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const priceId =
      plan === 'pro'
        ? Deno.env.get('STRIPE_PRO_PRICE_ID')
        : Deno.env.get('STRIPE_PLUS_PRICE_ID');
    if (!priceId) {
      log.error(`STRIPE_${plan.toUpperCase()}_PRICE_ID not configured`);
      throw new Error('Payment configuration error. Please contact support.');
    }

    // Check if user already has a Stripe customer
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = existingSubscription?.stripe_customer_id;

    // Create or retrieve customer
    if (!customerId) {
      // Check if customer exists in Stripe by email
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            supabase_user_id: userId,
          },
        });
        customerId = customer.id;
      }
    }

    // Create checkout session
    const returnOrigin = origin || "https://aiwmcquantis.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: userId, // PRIMARY: Used for user identification
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${returnOrigin}/app?checkout=success`,
      cancel_url: `${returnOrigin}/app?checkout=canceled`,
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          plan,
        },
        // Spec §11.3 — PRO ships with a 14-day free trial. Plus has no trial.
        ...(plan === 'pro' ? { trial_period_days: 14 } : {}),
      },
      metadata: {
        supabase_user_id: userId,
        plan,
      },
    });

    log.info(`Checkout session created: ${session.id}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    log.error("Checkout error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
