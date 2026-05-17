## Quantis Production Audit — Every Feature × Every Tier Verified

Goal: prove that **everything advertised on Pricing for Plus ($17/mo) and Pro ($49/mo) actually works end-to-end in production**, lock it with an automated test matrix, and surface a live "Tier Health" dashboard so regressions are caught the same day they ship.

### 0. Source of truth (already exists, do not rewrite)
- `src/config/tiers.ts` — `TIERS.free | plus | pro` with `features{}` + `limits{}` (17 feature flags, 6 limit keys per tier).
- `src/lib/tier-spec.ts` — `FEATURE_MANIFEST`, `enforceFeatureGate`, `UPGRADE_TRIGGERS`.
- `supabase/functions/_shared/entitlements.ts` + `_shared/tier-spec.ts` — server twin.
- `src/pages/Pricing.tsx` — marketing copy of what each tier promises.

**Pricing-vs-code mismatch to flag (not fix in this audit):** `tiers.ts` shows `plus.priceMonthly = 14`, `pro.priceMonthly = 41`, but messaging + Stripe legacy price + your request all say **$17 / $49**. Audit will report the delta; pricing reconciliation is a separate ticket.

---

### 1. Build the canonical Feature×Tier matrix (artifact, ~1 page)

For every advertised capability, one row in `/mnt/documents/quantis_tier_audit_matrix.md` with:

| Feature | Promised on Pricing | Tier flag in `tiers.ts` | Code path that enforces it | Server gate? | Test ID | Status |

Rows to cover (17 feature flags + 6 limits + 8 analysis-result fields):

**Analysis depth & content**
- depthQuick / depthFull / depthPro
- Monte Carlo scenario count (free=0, plus=95,500, pro=95,500)
- Projection horizon months (free=0, plus=36, pro=60)
- 5-year financial model (pro-only)
- Action plan generator (plus+)
- TAM / SAM / SOM (pro-only)
- Pre-Mortem stress test (plus+)
- Strategic Roadmap (pro-only)
- Pitch Deck data package (pro-only)

**Analysis result values (every numeric field the dashboard renders)**
- Monthly revenue, Net profit M12, Gross margin, LTV:CAC
- CAC payback (months) ← the new F3/F4 canonical primitive
- Project payback (years) ← split card just shipped
- Cash runway
- Confidence score, Stress map vectors
- Benchmark citations on every metric (F2 — Batch 3 work)
- Scenarios (pessimistic / base / optimistic), variance bands

**Docs, exports, ops**
- Document Studio (12 templates, plus+) + AI Doc Intelligence
- Invoice & Capacity Check (plus+)
- Custom branding (plus+) / White-label (pro-only)
- Watermark-free PDFs (plus+)
- Unlimited history (plus+)
- API access (pro-only — explicitly marked "v2 Q2 2026"; flag as roadmap, not regression)
- Team seats (free=0, plus=1, pro=3)
- Downloads/day cap, analyses/month cap

---

### 2. Automated tier-matrix test (the contract)

Extend `src/__tests__/tier-matrix.test.ts` to:

1. For each `TierId × FeatureKey`, assert the **client flag** in `TIERS[tier].features[key]` matches the **server flag** in `supabase/functions/_shared/entitlements.ts` (parity test — fails CI if drift).
2. For each feature flagged `true` on a tier, call the actual gated code path with a mocked subscription of that tier and assert it does NOT throw `FEATURE_GATED`.
3. For each feature flagged `false`, assert it DOES throw with the correct `required_tier` and the correct upgrade copy from `UPGRADE_TRIGGERS`.
4. Limit checks: monthly analyses, downloads/day, projection months, MC scenarios — assert the gate triggers at limit+1.

Result: one `vitest` run = full tier contract verified. Wire into `.github/workflows/ci.yml` as a required check.

---

### 3. End-to-end analysis-value harness (the stabilization layer)

New edge function `supabase/functions/run-tier-qa-harness/index.ts` (admin-only via existing `beltovbogdan@gmail.com` SECURITY DEFINER pattern). On invocation:

1. Run **6 canonical fixtures** (already exist in `src/lib/golden-test-vectors.ts` + `src/__tests__/golden-vectors.test.ts`): SaaS-B2B, marketplace, agency, e-com, brick-mortar, deep-tech.
2. For each fixture × each tier (free/plus/pro), call `analyze-business` server-side with a forged subscription header.
3. Assert every numeric field in the response:
   - Present (not null/undefined)
   - Within sane bounds (no `Infinity`, no `NaN`, no >1000% margins — leverages existing Anti-BS Checks)
   - Internally consistent (CAC payback ≠ project payback collision; LTV recomputed from primitives matches `unit_economics.ltv`)
   - Citation present on every benchmark-driven metric (Batch 3 of accuracy fix gates this)
   - Quality gates ran (`meta.gates_run === 12`, `meta.gates_failed.length === 0` for golden vectors)
4. Assert tier-specific deliverables actually appear:
   - plus → action plan present, scenarios=3, projection_months=36, watermark=false
   - pro → 5-year model present, TAM/SAM/SOM block populated, projection_months=60, pitch deck data block present, white-label flag honored
5. Persist results in new `tier_qa_runs` table (one row per fixture×tier×run) and surface in `/admin/quantis-health`.

---

### 4. Live "Tier Health" admin dashboard

Extend `src/pages/admin/QuantisHealth.tsx` with a section:

- Grid: rows = features, columns = [Free, Plus, Pro], cells = green/yellow/red badge from latest harness run.
- Red cell click → opens the failing assertion + last 3 run timestamps.
- "Run now" button → calls `run-tier-qa-harness`.
- Auto-runs nightly via existing pg_cron + `CRON_SECRET` pattern; alert webhook fires on any red cell.

---

### 5. Pricing-page reconciliation report (read-only output)

Generate `/mnt/documents/quantis_pricing_vs_reality.md`:

- Side-by-side: every bullet on `/pricing` → corresponding `tiers.ts` flag → harness result.
- Flags every claim with no enforcement path (e.g., "unlimited" not gated, "API access" advertised but UI ships Q2 2026, $17/$49 marketing vs $14/$41 in config).
- This is the brutal-honesty deliverable that tells you what to fix before the next launch.

---

### Execution order (estimated complexity — not credits)

1. **Matrix build** — read-only audit, generates the two `/mnt/documents` artifacts. **No code changes.**
2. **Tier-matrix parity tests** — extends one existing test file. Catches client/server drift forever.
3. **Schema + harness edge function** — new table `tier_qa_runs`, new function, 6 fixtures × 3 tiers = 18 assertions per run.
4. **Admin dashboard tile** — read-only UI on existing admin page.
5. **CI wire-up + cron schedule** — locks the contract.

Out of scope for this plan (each is its own ticket):
- Pricing-config price correction ($14→$17, $41→$49) — needs business decision on grandfathering.
- The remaining accuracy-fix Batches 2–5 (F2 citations, F3/F4 callsite migration, F5 gates always-on) — already planned separately.
- Building features that don't exist yet (API access UI, white-label generator if missing).

Reply **go** to start with Step 1 (matrix build — pure audit, zero risk), or name a different step to start.
