# Quantis Forensic Audit — Execution Plan

**Output:** `docs/AUDIT_2026-06-20.md` (committed to repo)
**Mode:** Evidence-first. Every finding carries a proof artifact (curl, SQL result, file:line, bundle grep, web citation) or is labeled `UNVERIFIED — probe X`.
**Severity ranking:** `(Severity × Leverage) ÷ Effort` on every finding.

## Phase 1 — Evidence collection (parallel where possible)

### A. Live product reality (Dim 1, 6)
- `curl` homepage, `/pricing`, `/examples/*`, `/cases`, `/refund-policy`, a blog post on `aiwmcquantis.com`. Capture `<title>`, meta, body-pre-hydration content, JSON-LD. Confirm/refute SPA-shell issue per URL.
- `curl` `sitemap.xml`, `robots.txt`. `site:aiwmcquantis.com` indexed-page count via web search.
- Run one Free analysis end-to-end via `supabase--curl_edge_functions` against `analyze-business`; capture verdict, 12 variables, P10/P50/P90, latency, RVCE observation count.
- `/health` curl across all ~35 edge functions → live-version table.

### B. Deploy chain & CI (Dim 2)
- Read `.github/workflows/production-deploy.yml`, `vercel-production-deploy.yml`, `seo-deploy.yml`, `staging-deploy.yml`, `deploy-smoke-test.yml`. Audit for `secrets.*` in `if:`, post-deploy version assertion, smoke-test rigor.
- Count tests: `rg "^(it|test)\(" src/__tests__ supabase/functions` — confirm 672/27 file claim or note drift.
- `EXPLAIN ANALYZE` on `analyses(identity_key, created_at)`, `idempotency_key`, benchmark-match query via `supabase--read_query` / `supabase--slow_queries`. PITR check via `supabase--db_health`.

### C. Paywall & entitlements (Dim 3)
- Bundle build → `rg` for hardcoded `$17`, `$49`, `unlimited`, `5 analyses` outside `src/config/tiers.ts`.
- Forge Free→Pro tier-claim body, curl `pdf-export`, `location-comparison`, `document-studio`, `analyze-business` (Pro path). Capture server response — does it block on line one or leak compute?
- Trace tier resolution: client claim vs DB truth.

### D. Stripe lifecycle (Dim 4)
- Read `stripe-webhook` source. Verify `stripe_webhook_events` idempotent INSERT … ON CONFLICT.
- Query `stripe_webhook_events` + `subscription_audit_log` for replay handling, double-provision evidence.
- Map handled events vs the 20-scenario matrix; mark each scenario PASS / FAIL / UNVERIFIED with the probe.

### E. Engine correctness (Dim 5)
- Run 5 analyses (coffee shop, SaaS, barbershop, e-commerce, consulting). For each: assert deterministic-first invariant, MC P50 == deterministic, every number has a source string, LLM prose contains no computed numbers.
- Cross-check benchmark count claim (95,500 / 46 sectors) against `benchmark_master_*` row counts.
- Hunt validator/QA layer — does `r3-validator` actually gate output?

### F. RVCE (Dim 6)
- For each test analysis, count observations rendered. Check `TAVILY_API_KEY` presence via `secrets--fetch_secrets`. Query `analyses` for `tavily_query_success_ratio` if logged.
- Confirm tier budgets (20/40/100) and NO_DATA fallback behavior.

### G. Observability & unit economics (Dim 7)
- Query `analyses`, `ai_calls`, `funnel_events`, `activation_events` for the last 30 days: ok-rate, degraded-rate, p50/p95 latency, cost/analysis by tier, signup→activated→repeat→paid funnel.
- Compute Plus $17 / Pro $49 gross margin at observed cost/analysis.
- Repeat-usage distribution (analyses per user) to test the one-shot-vs-subscription mismatch.

### H. Frontend (Dim 8)
- `rg "ErrorBoundary"` across `src/`. Dangling-import audit on routes in `src/App.tsx`.
- Token-conformance grep: Cabinet Grotesk / DM Sans / DM Mono presence; acid green `#8FFF2A` must be zero hits on Quantis surfaces.
- Mobile a11y: 375px aha-moment block, contrast, focus-visible — code-level scan.

### I. Security (Dim 9)
- `supabase--linter` for RLS gaps. Cross-identity RLS attempt via `supabase--curl_edge_functions` with two different auth tokens.
- Bundle grep for `sk_live_`, `price_`, `VITE_*` secret-leak surface.
- `securityheaders.com` grade via `code--fetch_website`. `npm audit` via `code--dependency_scan`.

### J. Competition (Dim 10)
- `websearch--web_search` for LivePlan, Bizplan, IdeaBuddy, "AI business validation 2026" — pricing, promise, gap vs Quantis.
- `semrush--competitive_analysis` on `aiwmcquantis.com` to surface buyer-intent gap keywords.

### K. Tech debt + R&D (Dim 11), Business model (Dim 12)
- Synthesized from B/E/G evidence; no separate probes.

## Phase 2 — Verdict & synthesis

Per dimension: findings table (`Severity | Leverage | Effort | Score | Proof | Fix`), then top-3 ranked fixes as concrete commands/prompts.

Final synthesis sections (per the master prompt):
1. **The Critical List** — every Critical finding + one-line proof + one-line fix.
2. **Ranked Remediation Map** — top 15 fixes by score, tagged `stabilize-now` / `handbook-prerequisite` / `post-handbook` / `growth`.
3. **Contradiction Register** — every site-vs-engine, pricing-vs-data mismatch.
4. **One-Day Triage** — ordered 8-hour list.
5. **30-Day Bet** — single highest-leverage program with success metric + kill condition.

## Phase 3 — Deliverable

Write `docs/AUDIT_2026-06-20.md` (the audit report — no code changes).
Update `mem://index.md` with a pointer to it for future runs.

## Technical notes

- Tool budget: ~40–60 calls. Parallelized: curls in batches, DB queries in batches, web searches in batches.
- No fabrication: any number not directly observed in a tool call is labeled `UNVERIFIED`.
- No code/migrations modified in this run — fixes are *prescribed in the doc*, executed in a follow-up build-mode session you approve separately.
- Re-runnable: same prompt against the same repo later produces a regression-delta.
