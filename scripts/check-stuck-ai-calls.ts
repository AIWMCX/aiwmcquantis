#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * Stuck ai_calls detector.
 *
 * GTM-audit item #15 (2026-08-26, Q81): "Do we alert a human in real time
 * when a pending ai_calls row goes unfinalized?" Confirmed via a real-code
 * investigation agent that the answer was NO -- migration
 * 20260825030500_add_ai_calls_pending_status.sql added a `status` column
 * (pending/completed/failed) and a purpose-built partial index
 * (`ai_calls_pending_idx ON ai_calls(created_at) WHERE status = 'pending'`)
 * specifically to make this query cheap, but nothing ever ran it. The
 * column's own comment spells out the failure mode: "A pending row with no
 * matching completed/failed row for the same request_id means the process
 * died mid-call" (llm-call.ts's recordAiCallPending()/finalizeAiCallDahl()
 * two-phase write, finalized via EdgeRuntime.waitUntil() -- if the isolate
 * is killed between the two, the row is stuck forever).
 *
 * Threshold: the longest tier timeout in _shared/tier-spec.ts is 90_000ms
 * (pro tier). STUCK_THRESHOLD_MINUTES gives a wide safety margin above
 * that (any real in-flight call, including retries, finalizes well inside
 * this window) so a flagged row is genuinely abandoned, not just slow.
 *
 * Read-only: only ever SELECTs. This is a detection primitive, not a
 * remediation tool -- a genuinely stuck row's downstream effects (did the
 * user's request time out? did they see an error? do they need a refund of
 * quota?) require human judgment, not an automated write.
 *
 * Run with:
 *   SUPABASE_ACCESS_TOKEN=sbp_... deno run --allow-net --allow-env scripts/check-stuck-ai-calls.ts
 */
const PROJECT_REF = "dmlxrvfyqsakyjomsvdj";
const TOKEN = Deno.env.get("SUPABASE_ACCESS_TOKEN");
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const STUCK_THRESHOLD_MINUTES = 15;

if (!TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN not set");
  Deno.exit(1);
}

async function runSql(query: string): Promise<unknown[]> {
  const resp = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text) as unknown[];
}

interface StuckRow {
  id: string;
  user_id: string | null;
  analysis_id: string | null;
  task: string;
  provider: string;
  model: string;
  created_at: string;
  age_minutes: number;
}

async function main() {
  const rows = (await runSql(`
    SELECT id, user_id, analysis_id, task, provider, model, created_at,
      EXTRACT(EPOCH FROM (now() - created_at)) / 60 AS age_minutes
    FROM public.ai_calls
    WHERE status = 'pending'
      AND created_at < now() - interval '${STUCK_THRESHOLD_MINUTES} minutes'
    ORDER BY created_at ASC
    LIMIT 200;
  `)) as StuckRow[];

  if (rows.length === 0) {
    console.log(`PASS: no ai_calls rows stuck in 'pending' for longer than ${STUCK_THRESHOLD_MINUTES} minutes.`);
    Deno.exit(0);
  }

  console.log(`Found ${rows.length} ai_calls row(s) stuck in 'pending' for longer than ${STUCK_THRESHOLD_MINUTES} minutes:`);
  for (const r of rows) {
    console.log(
      `  - ${r.id} | task=${r.task} provider=${r.provider} model=${r.model} ` +
      `age=${Math.round(r.age_minutes)}m analysis_id=${r.analysis_id ?? '(none)'} user_id=${r.user_id ?? '(none)'}`
    );
  }
  console.log(
    "\nThese processes likely died mid-call (isolate killed between the pending " +
    "insert and the finalize write) -- see llm-call.ts's recordAiCallPending()/" +
    "finalizeAiCallDahl(). Read-only detector; no rows were modified."
  );
  Deno.exit(1); // non-zero so a scheduled job alerts on any stuck row found
}

main();
