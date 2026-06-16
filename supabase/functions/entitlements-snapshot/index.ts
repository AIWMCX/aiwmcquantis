/**
 * entitlements-snapshot — frontend's source of truth for tier + limits.
 *
 * Returns the authenticated user's entitlement row sourced ONLY from
 * `plan_entitlements`. The frontend calls this after a Stripe webhook
 * lands (via the realtime listener on `subscriptions`) so the UI always
 * shows what the server actually enforces — no drift from cached client tier.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { maybeHealthResponse } from "../_shared/health.ts";
import { resolveServerTier } from "../_shared/server-tier.ts";

const FUNCTION_NAME = "entitlements-snapshot";
const FUNCTION_VERSION = "1.0.0";

serve(async (req) => {
  const cors = corsHeadersFor(req);
  const h = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (h) return h;
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Allow caller to pass a claimedTier for forgery detection (optional).
    let claimedTier: string | null = null;
    if (req.method === "POST") {
      try { claimedTier = ((await req.json())?.claimedTier ?? null) as string | null; } catch { /* ignore */ }
    } else {
      claimedTier = new URL(req.url).searchParams.get("claimedTier");
    }

    const result = await resolveServerTier(admin, user.id, { claimedTier });

    return new Response(
      JSON.stringify({
        ok: true,
        tier: result.tier,
        entitlements: result.entitlements,
        source: result.source,
        rejected_claim: result.rejected_claim,
        server_time: new Date().toISOString(),
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[entitlements-snapshot] error:", e);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
