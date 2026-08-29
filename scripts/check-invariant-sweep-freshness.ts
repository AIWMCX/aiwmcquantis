#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * Invariant-sweep freshness check.
 *
 * GTM-audit item #22 (2026-08-27/29, Phase 5 re-validation, charter 5.6):
 * "Add alerting for a failed sweep, new violation, missing daily run, or
 * persistence failure." The first three are covered -- a failing
 * financial-invariants-sweep.yml run already alerts via GitHub Actions'
 * own job-failure notification, and 2026-08-29's fix made a persistence
 * failure also fail that job (see scripts/sweep-financial-invariants.ts).
 * What's missing is the specific case where the sweep simply never runs
 * at all -- a disabled cron, a GitHub Actions outage, someone deleting
 * the workflow file -- none of which produce a failing run to notify on,
 * because there's no run at all. This script closes that gap: it checks
 * how long it's been since the last row in financial_invariant_sweep_runs
 * (written by every sweep run, pass or fail, per the 2026-08-29 fix) and
 * fails if that's longer than a sweep should ever plausibly be silent.
 *
 * Threshold: the sweep is scheduled daily (financial-invariants-sweep.yml,
 * `cron: '0 9 * * *'`). 30 hours gives a 6-hour buffer over the 24-hour
 * cadence -- generous enough to absorb normal GitHub Actions scheduling
 * jitter (which can run a `schedule:` trigger tens of minutes late under
 * load, occasionally longer), tight enough that a genuinely stopped cron
 * is caught within about a day and a quarter, not silently for weeks.
 *
 * Run with:
 *   SUPABASE_ACCESS_TOKEN=sbp_... deno run --allow-net --allow-env scripts/check-invariant-sweep-freshness.ts
 */
const PROJECT_REF = "dmlxrvfyqsakyjomsvdj";
const TOKEN = Deno.env.get("SUPABASE_ACCESS_TOKEN");
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const STALE_THRESHOLD_HOURS = 30;

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

// The Management API serializes Postgres numeric/EXTRACT results as JSON
// strings, not JSON numbers (confirmed live: age_hours came back as
// "0.296..." with quotes, not 0.296) -- almost certainly to avoid float
// precision loss over the wire. Typed and parsed as `unknown`/string here
// rather than `number`, so this doesn't silently throw the first time it
// runs for real (a naive `number` type would have let `.toFixed()` crash
// on a string at runtime, which is exactly the "fails silently in a way
// nobody notices" failure mode this whole check exists to prevent).
interface LatestRunRow {
  last_run_at: string | null;
  age_hours: string | null;
}

async function main() {
  const rows = (await runSql(`
    SELECT
      MAX(run_at) AS last_run_at,
      EXTRACT(EPOCH FROM (now() - MAX(run_at))) / 3600 AS age_hours
    FROM public.financial_invariant_sweep_runs;
  `)) as LatestRunRow[];

  const { last_run_at, age_hours } = rows[0];

  if (last_run_at === null) {
    console.log(
      "FAIL: financial_invariant_sweep_runs has zero rows -- the invariant sweep has apparently " +
      "never completed a single run (or every run has failed before reaching the point where it " +
      "records itself, which is itself worth investigating separately)."
    );
    Deno.exit(1);
  }

  const ageHoursNum = age_hours === null ? NaN : Number(age_hours);

  if (Number.isNaN(ageHoursNum) || ageHoursNum > STALE_THRESHOLD_HOURS) {
    console.log(
      `FAIL: the most recent invariant-sweep run was at ${last_run_at} -- ` +
      `${Number.isNaN(ageHoursNum) ? "an unparseable age" : ageHoursNum.toFixed(1) + " hours"} ago, past the ` +
      `${STALE_THRESHOLD_HOURS}-hour threshold for a job scheduled to run daily. Check whether ` +
      `.github/workflows/financial-invariants-sweep.yml is still enabled and firing ` +
      `(GitHub can silently disable a scheduled workflow after 60 days of repository inactivity).`
    );
    Deno.exit(1);
  }

  console.log(`PASS: most recent invariant-sweep run was ${ageHoursNum.toFixed(1)} hours ago (at ${last_run_at}), within the ${STALE_THRESHOLD_HOURS}-hour threshold.`);
  Deno.exit(0);
}

main();
