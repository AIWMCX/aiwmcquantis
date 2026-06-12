# Plan — Quantis Deep-Dive Audit (docs-only, zero prod risk)

## Deliverable

One file: `docs/QUANTIS_DEEP_DIVE_2026-06-12.md`, structured exactly per Part 10 of your master prompt:

1. Executive Verdict (≤ 1 page, 5 findings + yes/no on end-to-end success)
2. Health Scorecard (8 dimensions × 0–10 + evidence anchor)
3. Live Test Logs (raw results from every probe I run)
4. Findings Register (sorted Severity → Impact)
5. Transformation Map (T-specs → Wave 0/1/2/3)
6. 10–30x Ledger (your §0.3 table with measured "current" column)
7. Could-Not-Verify (honest blocker list)
8. Next 24 Hours (one command/change)

A companion `docs/QUANTIS_IMPROVEMENTS_MASTER.md` (consolidated improvements backlog) will be merged from the existing `docs/QUANTIS_IMPROVEMENTS_DATASET.md` + this audit's findings, keyed by invariant (I-1…I-10) and lever.

**No code, schema, edge function, migration, secret, or config change in this pass.** Pure audit.

## What I will actually do (forensic, evidence-backed)

### Read-only codebase forensics (no edits)
- Model call graph: `rg` every `anthropic|deepseek|gemini|openai|gateway|MODELS\.` in `src/` + `supabase/functions/` → table per call (model, layer, tier, timeout, retry, max_tokens, prompt path).
- Confirm `grep -rn "deepseek-chat\|deepseek-reasoner"` returns zero (I-6, CI guard verification).
- Envelope audit: read `supabase/functions/quantis-analyze` (or current analysis function) line-by-line, map to the 12-step contract, list every non-2xx escape path.
- Rate-limiter keying: `rg` for `quantis-analyze|functions.invoke|EDGE_FUNCTION_URL` in `src/` event handlers — flag any `useEffect`/`onChange`/debounce path.
- Bundle leak scan: `rg -n "sk_live_|upstash|ANTHROPIC|DEEPSEEK" dist/ src/` and confirm secrets aren't `VITE_`-prefixed (I-5).
- Frontend error-state grep: `rg -n "non-2xx|retry_after|Edge Function" src/` — any hit on user-facing path = CRITICAL.
- Design-token drift: `rg -n "#[0-9a-fA-F]{6}" src/ --include="*.tsx" --include="*.ts"` minus token files.
- Benchmark-count drift: `rg -n "95,?500|97,?500|1,?000\+" src/` — confirm one constant only (I-7).
- Price drift: `rg -n "\$17|\$14|\$39|\$149" src/` — flag mismatches with `TIERS`.
- Stripe webhook: read handler, check `event.id` idempotency, event coverage, billing_cycle population.
- RLS verification: `supabase--read_query` to enumerate tables + policies; flag any public table without policy.

### Live probes (read-only)
- `supabase--curl_edge_functions` against `quantis-analyze` (or current name) for the 5 canonical free analyses (coffee Austin · dental-SaaS Denver · fitness Miami · pet-food London · consulting Toronto) — capture raw envelope, latency, degraded flag, ai_layers_attempted/succeeded.
- Quota race: 2 concurrent identical idempotency keys → inspect `usage_counters` row deltas via `psql`.
- 7-analysis quota walk (1–5 succeed, 6–7 quota_exhausted).
- RVCE 6-test suite via `/dev/rvce-test` endpoint or direct `rvce-validate` curl → report `web_search_fired_ratio`, z-score outlier behavior, `rvce_validation_log` payload reality.
- Plus-paywall leak hunt: anonymous/free-token calls to PDF export, location comparison, Document Studio, adversarial pass edge functions → record HTTP status + body.
- Stripe checkout truth-test: **stop short of real Stripe call** — instead read the `create-checkout-session` function + `TIERS` constant and trace the price ID flow. I will NOT trigger a real test-mode checkout in this pass (it touches Stripe state); flagged for Wave 1 with your explicit approval.
- Web Vitals: `browser--performance_profile` on `/`, `/pricing`, `/app`.
- Public indexation: `websearch` `site:aiwmcquantis.com` to confirm "1 page indexed" reality.

### Could-Not-Verify items (declared upfront)
- Vercel deploy timestamps (no Vercel API access from sandbox)
- GSC indexation counts (no GSC access)
- PostHog/Sentry baselines (not connected)
- Real Stripe test checkout (deliberately deferred — has side effects)
- Production traffic distributions / per-user analysis counts beyond what `psql` SELECT can reveal
Each will be listed in section 7 with the exact access needed.

## Structure inside the deliverable

Every finding row:
`ID · Dimension · Severity · Business Impact · Confidence · Evidence (file:line or curl trace) · Root Cause · Fix · Effort`

Every T-spec row:
`ID · Lever(s) from §0.3 · Target state · Success criterion · Effort · Dependencies · Wave`

Invariant-violation findings are tagged `BLOCKS-Ix` and auto-promoted to CRITICAL.

## What I will NOT do in this pass

- No file edits except creating the two docs above
- No migrations, no edge function deploys, no secret changes
- No Stripe test-mode purchases
- No marking SEO/security findings "fixed"
- No memory updates until you approve the audit

## After you approve the audit

You pick which Wave 0 / Wave 1 items to execute — each becomes its own scoped build-mode session with its own preview verification. That's how we keep prod safe.

## Time

~20–30 min of read-only tool calls, then the doc write. One deliverable, one file, ready to diff against on the next re-run.
