// DECOMMISSIONED (P0-23, 2026-07-25) — see supabase/functions/.deploy-ignore.
//
// This was a duplicate financial engine with zero callers in src/ and two
// defects the live engine (analyze-business) had already fixed: undiscounted
// NPV and a margin-ceiling clamp that rewrote user-reported expenses. It was
// replaced in production by this inert 410 stub, but the repo kept the full
// implementation — so #246 (2026-10-15) redeployed the real logic, publicly
// reachable. The repo now holds the stub itself so no deploy can resurrect it.
// The old implementation remains in git history (before this commit).
Deno.serve((_req: Request) =>
  new Response(
    JSON.stringify({ error: 'Gone', message: 'calculate-financials was decommissioned (P0-23).' }),
    { status: 410, headers: { 'Content-Type': 'application/json' } },
  )
);
