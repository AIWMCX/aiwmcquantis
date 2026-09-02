import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

import { corsHeadersFor } from "../_shared/cors.ts";
import { getEngagementOfferByCode } from "../_shared/engagement-offers.ts";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
};

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  const headers = { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" };

  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe is not configured");

    const body = await req.json().catch(() => null) as { offer_code?: unknown } | null;
    const offer = getEngagementOfferByCode(body?.offer_code);
    if (!offer) {
      return new Response(JSON.stringify({ error: "invalid_offer" }), { status: 400, headers });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const [link, lineItems] = await Promise.all([
      stripe.paymentLinks.retrieve(offer.paymentLinkId),
      stripe.paymentLinks.listLineItems(offer.paymentLinkId, { limit: 10 }),
    ]);

    const line = lineItems.data[0];
    const validCatalog =
      link.active === true &&
      lineItems.data.length === 1 &&
      line?.quantity === 1 &&
      line?.price?.unit_amount === offer.expectedAmountMinor &&
      line?.price?.currency?.toLowerCase() === offer.currency &&
      line?.price?.type === "one_time";

    if (!validCatalog || !link.url) {
      console.error("engagement-checkout: live Stripe catalog mismatch", {
        offer_code: offer.code,
        payment_link_id: offer.paymentLinkId,
      });
      return new Response(JSON.stringify({ error: "offer_temporarily_unavailable" }), { status: 503, headers });
    }

    const siteUrl = (Deno.env.get("PUBLIC_SITE_URL") || "https://www.aiwmcquantis.com").replace(/\/$/, "");
    const redirectUrl = `${siteUrl}/engagement-intake?session_id={CHECKOUT_SESSION_ID}`;

    // Idempotently enforce the secure, session-bound intake redirect before
    // returning the live checkout URL. This changes no price and creates no charge.
    const configured = await stripe.paymentLinks.update(offer.paymentLinkId, {
      after_completion: {
        type: "redirect",
        redirect: { url: redirectUrl },
      },
      metadata: {
        offer_code: offer.code,
        fulfillment_mode: "founder_assisted",
        cases_included: String(offer.caseCapacity),
      },
    });

    // Separate, best-effort call: requires the Stripe account's own Terms of
    // Service URL to be set (Dashboard -> Settings -> Public details) or
    // Stripe rejects it. A missing account-level ToS URL must never break
    // checkout-URL generation, so this failure is swallowed and logged, not
    // surfaced to the buyer.
    try {
      await stripe.paymentLinks.update(offer.paymentLinkId, {
        consent_collection: { terms_of_service: "required" },
      });
    } catch (consentErr) {
      console.error(
        "engagement-checkout: could not enable terms consent collection (likely missing account ToS URL)",
        consentErr instanceof Error ? consentErr.message : String(consentErr)
      );
    }

    if (!configured.url) {
      return new Response(JSON.stringify({ error: "offer_temporarily_unavailable" }), { status: 503, headers });
    }

    return new Response(JSON.stringify({ url: configured.url }), { status: 200, headers });
  } catch (error) {
    console.error("engagement-checkout failed", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "checkout_unavailable" }), { status: 500, headers });
  }
});
