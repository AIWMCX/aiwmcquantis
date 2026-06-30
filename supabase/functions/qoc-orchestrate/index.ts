// ============================================================================
// Supabase Edge Function: qoc-orchestrate (HTTP entrypoint)
// ----------------------------------------------------------------------------
// Thin transport layer. Parses + auth-checks the request, builds deps, runs the
// orchestrator, returns the audit envelope. All logic lives in ./qoc/*.
// ============================================================================

// @ts-ignore deno remote import (resolved at deploy)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { orchestrate } from "./qoc/orchestrator.ts";
import { httpStatusFor } from "./qoc/policies.ts";
import { makeDeps } from "./adapters.ts";
import type { AnalysisRequest } from "./qoc/types.ts";

// deno-lint-ignore no-explicit-any
const Deno: any = (globalThis as any).Deno;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
(globalThis as any).Deno?.serve?.(async (httpReq: Request) => {
  if (httpReq.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (httpReq.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Partial<AnalysisRequest>;
  try {
    body = await httpReq.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // --- Auth: resolve the user from the bearer token (RLS-safe) --------------
  const authHeader = httpReq.headers.get("Authorization") ?? "";
  const sb = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await sb.auth.getUser();
  const user_id = userData?.user?.id;
  if (!user_id) return json({ error: "unauthorized" }, 401);

  // --- Build the validated request ------------------------------------------
  const req: AnalysisRequest = {
    request_id: body.request_id ?? crypto.randomUUID(),
    user_id,
    plan: (body.plan as AnalysisRequest["plan"]) ?? "free",
    idea: String(body.idea ?? ""),
    location: body.location,
    industry: body.industry,
    revenue: body.revenue,
    price: body.price,
    customers: body.customers,
    operating_costs: body.operating_costs,
    cac: body.cac,
    churn_rate: body.churn_rate,
    initial_investment: body.initial_investment,
  };

  // Input length guard — reject before orchestration
  const ideaLen = req.idea.length;
  const locLen = typeof req.location === "string" ? req.location.length : 0;
  if (ideaLen > 20_000 || locLen > 200) {
    const field = ideaLen > 20_000 ? "idea" : "location";
    const limit = field === "idea" ? 20_000 : 200;
    const actual = field === "idea" ? ideaLen : locLen;
    return json({
      error: "input_too_long",
      field,
      limit,
      actual,
      message: `${field} is ${actual.toLocaleString()} characters (max ${limit.toLocaleString()}). Please shorten it.`,
    }, 422);
  }

  const deps = makeDeps(sb);
  // Inject user_id onto the envelope for the audit insert (see adapters).
  const patchedDeps = {
    ...deps,
    store: {
      ...deps.store,
      putEnvelope: (env: any) => deps.store.putEnvelope({ ...env, __user_id: user_id }),
    },
  };

  try {
    const envelope = await orchestrate(req, patchedDeps);
    return json(envelope, httpStatusFor(envelope));
  } catch (e) {
    return json({ error: "orchestrator_error", detail: String((e as Error)?.message ?? e) }, 500);
  }
});
