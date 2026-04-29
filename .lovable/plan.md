
# Quantis Build Audit & Stabilization-to-Sell Pipeline

A genius-level, evidence-grounded audit comparing both SOWs (Strategic + x100 Technical) against the live codebase, followed by a session-by-session pipeline that stabilizes the foundation first, then opens the revenue gate.

---

## Part 1 — Verified ground truth (what is ACTUALLY in the repo right now)

Cross-checked against codebase + live Supabase. No assumptions.

| SOW Dimension | SOW Score | Verified Reality | True Score |
|---|---|---|---|
| 1. Conceptual architecture | 8.0 | Deterministic engine, dual-AI consensus, 7-layer safety, calibration tables exist | **8.0 ✓** |
| 2. Data infrastructure | 4.0 | 19,511 rows in `benchmarks_v2_core`; **only 2 of 12 connectors live** (ProjectionHub + SEC XBRL); zero calibration signals collected yet | **4.5** |
| 3. Marketing / positioning | 3.0 | Single landing for all ICPs; **no `/for-consultants`, `/for-founders`, `/for-students`, `/for-smb-owners`** | **3.0 ✓** |
| 4. Conversion funnel | 2.0 | Analytics file exists (`src/lib/analytics.ts`), Sentry installed (`src/lib/sentry.ts`); but **no no-input demo path** | **3.5** |
| 5. Pricing | 2.0 | **Still $17/mo Plus everywhere** (`tier-spec.ts` lines 266/372/386/400/448, `Pricing.tsx` titles+descriptions). No Founder/Consultant/Agency tiers. No annual toggle. | **2.0 ✓** |
| 6. Trust signals | 2.0 | `Methodology.tsx` page exists but **no downloadable PDF**; no `/cases/[slug]` directory; no founder photo/letter component | **2.5** |
| 7. Retention design | 2.0 | **Zero hits** for `watchlist`, `scenario fork`, `parent_id`, `outcome_track` in code | **1.0** |
| 8. Multi-tenancy | 1.0 | No `workspace_id` table; analyses tied to single `user_id` | **1.0 ✓** |
| 9. API / embed | 1.0 | `api-analyze` edge function exists but **no API keys table for end-customers**, no OpenAPI spec, no `api.aiwmcquantis.com` subdomain, no embed widget | **2.0** |
| 10. Mobile / a11y | 5.0 | Default Tailwind/shadcn; no audit | **5.0 ✓** |
| 11. Observability | 3.0 | Sentry + analytics scaffolded; **funnel events not all wired** (no `paid_checkout_complete`-style end-to-end visible) | **4.0** |
| 12. Lead generation | 7.0 | **No `n8n`, `ses_send`, or outbound infrastructure in repo** — playbook only | **3.0** |

**True composite: 3.3 → 3.4** (matches SOW within rounding). Sales gate is blocked by dimensions 5, 6, 7, 8, 12 — none requires research, all require execution.

**Live database snapshot:**
- 19 analyses run total (proves engine works, proves zero-traffic problem)
- 19,511 benchmark rows (asset present)
- 2 ingestion runs succeeded (SEC + ProjectionHub) — pipeline proven, not yet broad
- 0 calibration signals — feedback loop wired but not yet flowing data

---

## Part 2 — Stabilization-to-Sell Pipeline (sequenced sessions)

Every session has: (a) a single hardening goal, (b) an acceptance test, (c) a sales-gate impact. We do NOT add features; we **finish unfinished moats** and close revenue gates in the order that compounds fastest.

### Track A — STABILIZE (Sessions 1–4, must complete before sell)

#### Session 1 — Pricing rebuild & checkout truth
**Goal:** Replace $17 anchor with the SOW's 4-tier ladder.
- New tiers in `tier-spec.ts` + `config/tiers.ts`: Free / Founder $29 / Consultant $149 / Agency $499 (monthly + annual −20%).
- Stripe products created via existing `create-checkout-session` flow; old $17 grandfathered.
- `Pricing.tsx` rewritten with outcome-led copy per tier (not feature lists).
- All 5 hardcoded `$17` strings purged.
- **Acceptance:** Visiting `/pricing` shows 4 cards with annual toggle; `paid_checkout_start` event fires per tier.
- **Sells:** Removes the single biggest disqualifier for consultants & agencies.

#### Session 2 — Funnel instrumentation closure
**Goal:** Make every dollar trackable.
- Verify the 8 SOW funnel events fire end-to-end: `home_view → free_signup_start → free_signup_complete → analysis_start → analysis_complete → pricing_view → paid_checkout_start → paid_checkout_complete`.
- Dashboard page at `/admin/funnel` aggregates from existing analytics tables.
- **Acceptance:** Run a test purchase; all 8 events present in admin funnel within 1 minute.
- **Sells:** Without this, every later optimization is blind.

#### Session 3 — Reality-loop activation (pipe the calibration data we already wired)
**Goal:** Start filling the empty `engine_learning_signals` and `benchmark_calibration` tables.
- Schedule `ingest-data-sources` weekly via pg_cron.
- Wire `ActualsImporter.tsx` → `record_engine_learning_signal()` so every actuals upload writes a signal.
- Backfill: replay the 19 historical analyses against current benchmarks to seed first calibration rows.
- **Acceptance:** ≥10 rows in `engine_learning_signals`, ≥1 row in `benchmark_calibration` after run.
- **Sells:** "Forecast accuracy improved by X% in your industry this month" becomes a real Plus retention hook.

#### Session 4 — Methodology PDF + founder voice (cheapest trust artifact)
**Goal:** Two trust artifacts shipped.
- Generate downloadable methodology PDF (via existing `@react-pdf/renderer` pipeline) covering: deterministic engine, Monte Carlo, source list with the 12 SOW connectors marked Live/Planned, dual-AI consensus, confidence scoring with calibration formula.
- Add founder voice block to homepage hero (photo, name, 80–120 word letter).
- **Acceptance:** `/methodology.pdf` downloads from CDN; homepage renders founder block above the fold.
- **Sells:** First reason a financial buyer trusts the brand enough to enter a credit card.

### Track B — UNLOCK HIGH-LTV BUYERS (Sessions 5–7, opens Consultant/Agency revenue)

#### Session 5 — Watchlist + Scenario Fork (retention spine)
- DB: `watchlists(user_id, industry_slug, geo_slug, created_at)`, `analysis_forks(parent_id, fork_label, diff_json)`.
- UI: "Save to Watchlist" button on every analysis; "What if?" fork CTA in result wizard.
- Cron `check-churn-signals` extended to fire watchlist alert emails.
- **Acceptance:** Logged-in user can save a watchlist item, fork an analysis, receive an alert email when a benchmark in the slice changes >10%.
- **Sells:** Converts subscription from one-shot to recurring need — the structural fix for churn.

#### Session 6 — No-input demo path
- New route `/demo` that auto-plays a pre-rendered analysis (use existing example data) in <30 seconds with progressive reveal animation.
- Homepage primary CTA changes from "Try Free" (which demands data) to "See a Sample" (which demands nothing).
- **Acceptance:** Anonymous visitor reaches the full sample report in <30s with zero form fields.
- **Sells:** Top-of-funnel conversion lift; what separates a 0.5% landing-page conversion from 3%.

#### Session 7 — First 3 segment landing pages + 3 case studies
- `/for-consultants`, `/for-founders`, `/for-smb-owners` (skip students for revenue focus).
- `/cases/[slug]` template + 3 named case studies (run free Quantis analyses for 3 real targets, secure attribution).
- Each segment page links to a tier-emphasized pricing variant.
- **Acceptance:** Each page has Lighthouse SEO ≥90 and a unique CTA per segment.
- **Sells:** Segment-specific trust = consultant-pays-$149 conversion.

### Track C — DATA MOAT WIDENING (Sessions 8–10, in parallel with selling)

#### Session 8 — BLS QCEW + Census CBP + FRED connectors
- Add 3 connectors to `ingest-data-sources/index.ts` following the existing ProjectionHub pattern.
- Wire to `benchmarks_v2_core`; mark provenance.
- **Acceptance:** Each connector populates ≥100 rows; admin dashboard shows green status.
- **Sells:** Triples the "evidence per analysis" claim and unlocks the triangulation view.

#### Session 9 — Consensus benchmark view + confidence-decay
- Materialized view `consensus_benchmark` per the technical SOW §4.1 (≥2 sources, CV<15% gives confidence 0.80).
- SQL function `effective_confidence(base, age)` with half-lives by variable type (SOW §4.3).
- Engine reads consensus first, falls back to single-source.
- UI surfaces "Confidence: 0.87 — 3 sources" badge per metric.
- **Acceptance:** A coffee-shop analysis shows triangulated confidence per number; PDF export includes confidence column.
- **Sells:** Visible accuracy proof in every analysis & PDF — the methodology paper's claims become demonstrable.

#### Session 10 — Multi-tenant workspace foundation (non-breaking migration)
- New tables: `workspaces(id, owner_id, name, plan)`, `workspace_members(workspace_id, user_id, role)`.
- Every existing analysis gets a default personal workspace via migration.
- API: `workspace_id` accepted on analysis create; defaults to user's personal workspace.
- **Acceptance:** Existing flows unchanged; admin UI can create a workspace and invite a member.
- **Sells:** Hard prerequisite for Consultant ($149) and Agency ($499) tier delivery.

### Track D — REVENUE ACTIVATION (Sessions 11–12, when above is solid)

#### Session 11 — White-label PDFs + scheduled outbound switch-on
- Custom logo + color palette on Consultant-tier PDF exports (uses existing brand-profile service).
- Scaffold one outbound campaign: pg_cron + `send-lifecycle-email` extended to send 25/day from warm IP to a 200-row target list (compliance footer + suppression list already exist for newsletter).
- **Acceptance:** A Consultant-tier user sees their logo on the export; outbound dashboard shows daily send count + reply tracking.
- **Sells:** First repeatable acquisition channel + first justification for $149/mo.

#### Session 12 — Public API v0 + key management
- DB: `api_keys(workspace_id, key_hash, scopes, created_at, revoked_at)`.
- Edge function `api-v1-analyze` with rate-limit by key (existing `useRateLimit` extended).
- Minimal docs page `/api/docs` (OpenAPI YAML rendered with redoc-static).
- Restricted to Agency tier.
- **Acceptance:** A test API key creates an analysis via curl; rate limit enforced.
- **Sells:** Unlocks the $499 tier and starts the 5-year embed-distribution thesis.

---

## Part 3 — Operating Rules per session

These prevent regression while shipping fast.

1. **No new feature without an acceptance test that a non-technical user can verify.**
2. **Every session ends with: visual QA on PDF/UI changes + admin smoke check.**
3. **Pricing & tier strings are centralized** — never hardcoded; one constant file feeds Stripe, UI, emails, PDFs.
4. **Database changes use migrations only** (no ad-hoc SQL); types regenerated; RLS policies reviewed.
5. **Calibration & analytics events are mandatory in every code path that touches money or accuracy** — block PR if missing.
6. **No silent fallbacks**: if benchmark match quality < threshold, surface it in UI + PDF (per the existing `overall_match_quality` field).

---

## Part 4 — What this audit is NOT proposing

To keep focus on stabilize-then-sell:

- **No** mobile app
- **No** new viral marketing posts
- **No** redesign of working surfaces (dashboard, results wizard)
- **No** SOC 2 work yet (Q4 SOW commitment — too early)
- **No** Bayesian Monte Carlo refactor (Q4 — depends on calibration data we're only just starting to collect)
- **No** Companies House / 9 remaining connectors yet (after the 3 most-cited US sources are flowing)

---

## Part 5 — Definition of "Ready to Sell"

We turn on outbound only when **all** of these are green (gating checklist):

- [ ] 4 pricing tiers live, all Stripe products active, $17 references purged
- [ ] 8 funnel events firing end-to-end, dashboard accessible
- [ ] Methodology PDF downloadable; founder voice on homepage
- [ ] No-input demo at `/demo` working in <30s
- [ ] 3 case studies + 3 segment landing pages live
- [ ] Watchlist + scenario fork shipped (retention reason exists)
- [ ] BLS QCEW + Census CBP + FRED connectors flowing into `benchmarks_v2_core`
- [ ] Consensus view live; confidence badges in UI + PDF
- [ ] Workspace migration shipped; backwards-compatible
- [ ] First 5 internal end-to-end test purchases at each tier succeed

That's the gate. After it: turn on outbound (Session 11), then API (Session 12), then scale.

**Approve this and we begin Session 1 (pricing rebuild) immediately. Reject any individual session and I will revise the sequence without re-doing the whole plan.**
