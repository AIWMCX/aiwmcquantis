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

    const { plan, promotion_code, billing_period } = await req.json() as {
      plan?: string;
      promotion_code?: string;
      billing_period?: string;
    };
    const promoCodeRaw = (promotion_code ?? '').trim().toUpperCase();
    const billingPeriod = billing_period === 'annual' ? 'annual' : 'monthly';
    log.info(`Creating checkout session for plan: ${plan} (${billingPeriod}), user: ${userEmail}${promoCodeRaw ? ` (promo: ${promoCodeRaw})` : ''}`);

    // ── Abuse prevention: reject repeat redemption before we ever call Stripe ──
    // Defense-in-depth on top of Stripe's own `max_redemptions` cap and
    // `first_time_transaction` restriction: even if those are misconfigured,
    // one Supabase user can never redeem the same promo code twice, because
    // `promo_redemptions` is only ever written by the webhook after a real,
    // Stripe-confirmed checkout (see stripe-webhook/index.ts).
    if (promoCodeRaw) {
      const { data: existingRedemption } = await supabase
        .from('promo_redemptions')
        .select('id')
        .eq('user_id', userId)
        .eq('promo_code', promoCodeRaw)
        .maybeSingle();
      if (existingRedemption) {
        log.warn(`Promo code ${promoCodeRaw} already redeemed by user ${userId} — rejecting duplicate`);
        return new Response(
          JSON.stringify({
            error: 'You have already redeemed this promotion.',
            code: 'PROMO_ALREADY_REDEEMED',
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Canonical Master Spec — both Plus AND Pro ship with a 14-day free trial.
    // (Previously only Pro got the trial; that contradicted the canon and
    // blocked the AIWMCQ17 marketing campaign which depends on Plus trial.)
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

    // Price ID resolution — 4 possible env vars (plan x billing period).
    // Verified live against Stripe (2026-06-30): Plus monthly/annual =
    // price_1SjnEiLKMhSmZURCONsiueNU / price_1SvWTaLKMhSmZURClCoqty4O.
    // Pro monthly/annual = price_1TNnKkLKMhSmZURCWyQTblmg / price_1TNnUbLKMhSmZURC3DetuKsA.
    // Monthly env var names try both conventions — stripe-webhook/index.ts's
    // PRO_PRICE_IDS reads STRIPE_PRO_MONTHLY_PRICE_ID while this function
    // historically read STRIPE_PRO_PRICE_ID for the same value; accept
    // either so a single Supabase secret naming convention isn't required.
    const priceEnvCandidates =
      plan === 'pro'
        ? billingPeriod === 'annual'
          ? ['STRIPE_PRO_ANNUAL_PRICE_ID']
          : ['STRIPE_PRO_PRICE_ID', 'STRIPE_PRO_MONTHLY_PRICE_ID']
        : billingPeriod === 'annual'
          ? ['STRIPE_PLUS_ANNUAL_PRICE_ID']
          : ['STRIPE_PLUS_PRICE_ID', 'STRIPE_PLUS_MONTHLY_PRICE_ID'];
    const priceId = priceEnvCandidates.map((k) => Deno.env.get(k)).find(Boolean);
    if (!priceId) {
      log.error(`None of [${priceEnvCandidates.join(', ')}] configured`);
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

    // ── Promotion code resolution ──────────────────────────────────────────
    // If the client passed a promo code (e.g. AIWMCQ17 from /trial landing),
    // resolve it against Stripe's promotion_codes API. We never trust the
    // string blindly — Stripe enforces max_redemptions and expiry server-side.
    // If the code is invalid/expired/exhausted, we DO NOT fail the checkout —
    // we fall through to a normal trial-only checkout and let the user discover
    // the issue on the Stripe page (with `allow_promotion_codes: true`).
    let resolvedPromotionCodeId: string | undefined;
    if (promoCodeRaw) {
      try {
        const list = await stripe.promotionCodes.list({
          code: promoCodeRaw,
          active: true,
          limit: 1,
        });
        if (list.data.length > 0) {
          resolvedPromotionCodeId = list.data[0].id;
          log.info(`Promo code resolved: ${promoCodeRaw} → ${resolvedPromotionCodeId}`);
        } else {
          log.warn(`Promo code not found or inactive: ${promoCodeRaw}`);
        }
      } catch (err) {
        log.warn(`Promo code lookup failed for ${promoCodeRaw}:`, err);
        // Fall through — Stripe page will offer the input field manually
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
      cancel_url: `${returnOrigin}/app?checkout=canceled${promoCodeRaw ? `&promo=${promoCodeRaw}` : ''}`,
      // Canonical Master Spec: both Plus AND Pro ship with 14-day free trial.
      // QNT: explicit end-behavior — if the trial ends with no usable payment
      // method on file, cancel the subscription outright rather than leaving
      // Stripe to fall back on undocumented default retry behavior. This
      // stops trials from lingering in an undefined state indefinitely.
      subscription_data: {
        trial_period_days: 14,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
        metadata: {
          supabase_user_id: userId,
          plan,
          billing_period: billingPeriod,
          ...(promoCodeRaw ? { applied_promo_code: promoCodeRaw } : {}),
        },
      },
      metadata: {
        supabase_user_id: userId,
        plan,
        billing_period: billingPeriod,
        ...(promoCodeRaw ? { applied_promo_code: promoCodeRaw } : {}),
      },
      // Server-side promo application (preferred path — UX is instant)
      ...(resolvedPromotionCodeId ? { discounts: [{ promotion_code: resolvedPromotionCodeId }] } : {}),
      // Fallback: also expose Stripe's built-in promo input field on the
      // checkout page, so users can manually enter a code if needed.
      // NOTE: discounts and allow_promotion_codes are mutually exclusive —
      // we use discounts when we resolved a code, allow_promotion_codes otherwise.
      ...(resolvedPromotionCodeId ? {} : { allow_promotion_codes: true }),
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
