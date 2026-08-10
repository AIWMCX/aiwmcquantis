/**
 * admin-health-sweep — fan-out ?health=1 to every Edge Function.
 *
 * Admin-only (beltovbogdan@gmail.com per the project security memory).
 * Powers /admin/edge-health page: shows version, deployed_at, commit_sha
 * for every function with status grouping (ok | mismatch | unreachable).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { maybeHealthResponse } from "../_shared/health.ts";

const FUNCTION_NAME = "admin-health-sweep";
const FUNCTION_VERSION = "1.0.0";

// Canonical list of functions we expect to be deployed with ?health=1 support.
// Keep in sync with supabase/functions/* directories. Generated once;
// `scripts/verify-deploy.sh` is the authoritative gate in CI.
const FUNCTIONS = [
  "aggregate-quality-metrics","ai-consensus","ai-narrator","alert-webhook",
  "analyze-business","analyze-plus","analyze-preview","analyze-pro-extension",
  "analyze-pro-worker","api-analyze","api-analyze-main","autoposter-generate-content",
  "benchmarks-query","bot-detection","calculate-financials","check-churn-signals",
  "check-lifecycle-emails","create-api-key","create-checkout-session","create-portal-session",
  "doc-queue-worker","entitlements-snapshot","export-document","generate-document",
  "generate-document-content","generate-idea","health-check","ingest-benchmark-data",
  "ingest-benchmark-v2","ingest-data-sources","invoice-capacity-check","manage-benchmarks",
  "manage-knowledge-base","newsletter-unsubscribe","parse-document",
  "process-doc-job","process-subscription-downgrades","publish-due-posts","queue-export",
  "replay-webhook-events","run-accuracy-harness","run-tier-qa-harness","rvce-validate",
  "score-import","seed-benchmarks","self-learning-update","send-lead-magnet",
  "send-lifecycle-email","send-weekly-insights","send-welcome-email","share-report",
  "stripe-webhook","team-invite","template-optimizer","warm-functions",
];

interface ProbeResult {
  function: string;
  status: "ok" | "unreachable" | "missing_version" | "error";
  http_status: number | null;
  version: string | null;
  deployed_at: string | null;
  commit_sha: string | null;
  latency_ms: number | null;
  error: string | null;
}

async function probe(fn: string, projectRef: string, anonKey: string, timeoutMs: number): Promise<ProbeResult> {
  const url = `https://${projectRef}.supabase.co/functions/v1/${fn}?health=1`;
  const started = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "apikey": anonKey, "Authorization": `Bearer ${anonKey}` },
      signal: ctrl.signal,
    });
    const latency = Date.now() - started;
    const text = await res.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { /* non-JSON */ }
    if (!res.ok) {
      return { function: fn, status: "error", http_status: res.status, version: null, deployed_at: null, commit_sha: null, latency_ms: latency, error: text.slice(0, 200) };
    }
    if (!body?.version) {
      return { function: fn, status: "missing_version", http_status: res.status, version: null, deployed_at: body?.deployed_at ?? null, commit_sha: body?.commit_sha ?? null, latency_ms: latency, error: "no version field" };
    }
    return {
      function: fn,
      status: "ok",
      http_status: res.status,
      version: body.version,
      deployed_at: body.deployed_at ?? null,
      commit_sha: body.commit_sha ?? null,
      latency_ms: latency,
      error: null,
    };
  } catch (e) {
    return { function: fn, status: "unreachable", http_status: null, version: null, deployed_at: null, commit_sha: null, latency_ms: Date.now() - started, error: (e as Error).message };
  } finally {
    clearTimeout(t);
  }
}

serve(async (req) => {
  const cors = corsHeadersFor(req);
  const h = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (h) return h;
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    // Admin gate — Beltov-only per project memory.
    if (user.email !== "beltovbogdan@gmail.com") {
      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    const projectRef = (Deno.env.get("SUPABASE_URL") ?? "").match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!projectRef || !anonKey) {
      return new Response(JSON.stringify({ error: "project_misconfigured" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Run probes in parallel with a 5s per-function timeout.
    const results = await Promise.all(FUNCTIONS.map((fn) => probe(fn, projectRef, anonKey, 5000)));
    const counts = { ok: 0, unreachable: 0, missing_version: 0, error: 0 };
    for (const r of results) counts[r.status]++;

    return new Response(
      JSON.stringify({
        ok: true,
        scanned_at: new Date().toISOString(),
        total: results.length,
        counts,
        results: results.sort((a, b) => a.function.localeCompare(b.function)),
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[admin-health-sweep] error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
