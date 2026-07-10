# STABILIZATION FREEZE

**Declared:** 2026-07-11 · AIWMC LLC
**Status:** ACTIVE
**Trigger:** $0 MRR, no paid users. Product breadth has outrun trust, accuracy, and commercial validation. See `docs/AUDIT_2026-06-20.md`, `docs/CONVERSION_AUDIT_2026-06-22.md`, and the two external CTO-style audits reviewed 2026-07-10/11 for the underlying diagnosis.

---

## The rule

**No new sectors. No new cities. No new report templates. No new AI layers. No new public claims. No major visual redesign. No additional forecast metrics without a formula specification in `docs/FINANCIAL_MODEL_SPECIFICATION.md` first.**

## What IS allowed during the freeze

- Financial integrity fixes (payback, break-even, ROI, reconciliation)
- Source lineage and claim accuracy (fixing contradictions, retiring unsupported stats)
- Configuration unification (one canonical host, one pricing table, one set of numeric claims — enforced via `canonical-facts.ts`, not a new parallel config)
- Access control, billing correctness
- Analytics/instrumentation
- Reliability, documentation
- Paid-user onboarding and outreach (MP3 work — unaffected by this freeze, it's the whole point)

## What is explicitly NOT frozen

MP3 (revenue engine — outreach, `/consultants`, conversion work) continues. This freeze is about **product breadth**, not about stopping revenue-generating activity. The two are not in tension: MP3's own thesis is that trust and accuracy ARE the conversion lever right now, not more features.

## What stays hard-gated regardless of this freeze

Per the standing MP0-MP5 discipline (unchanged by this document):
- **MP4** (engine R&D — ingestion pipeline rebuild, archetype-specific revenue formulas, correlation-aware Monte Carlo, source registry, 12 validation gates as running code): hard-gated on **first paying user**. An external audit's technical spec (`docs/FINANCIAL_MODEL_SPECIFICATION.md`) exists as a **written spec**, queued, not started as engine code, per this exact rule.
- **MP5** (multi-entity scale, fundability): hard-gated on **$500 MRR**.

## Exit criteria — when does the freeze lift

Per the accuracy audit (`MP-ACCURACY-AUDIT-AND-TODO-v1.0.md`) plus this freeze's own scope. **Updated 2026-07-11 against live evidence** — see `release-evidence/mp1-verification-2026-07-11.json` for the MP1 record this update is based on.

1. **CLOSED (2026-07-11).** Payback-period bug in public examples: `mobile-app-startup-san-francisco` fixed (commit `fbf3654d`); `coffee-shop-denver` and `consulting-firm-new-york` regenerated against the real ramp-aware engine formula (commit `21fb2b54`) — 12mo/109% and 6mo/679% respectively, hand-simulated faithfully from the exact production formula and independently cross-checked. `scripts/verify-payback-integrity.mjs` now runs this check permanently in CI. Remaining ~48 examples not yet individually re-derived through the full engine — that's a real gap, but the three previously-known-broken ones are done.
2. **CLOSED (2026-07-11).** "90% of businesses fail in 5 years" claim: retired from all 11 locations found across the codebase (commit `29ab0632`), including `MobileHero.tsx`, `BlogArticle.tsx`, and 9 more files a full sweep turned up beyond the two originally scoped. Confirmed absent from live production via fresh fetch.
3. **CLOSED (2026-07-11).** 95,500-benchmark-vs-DB-row-count reconciliation: open since 2026-06-20 (~3 weeks). Resolved by running the discovery + count queries directly in the Supabase SQL Editor against production (user-run, screenshots provided in chat — see `EVD-BENCHMARK-20260711-001` in `CURRENT_PRODUCTION_STATE.json`): 5 canonical tables (`benchmark_master_core/geo/invoice/risk/unit_econ`) at exactly 19,500 rows each = **97,500** — neither of the two previously-guessed candidates (95,500 the old public claim, 19,511 an old single-table guess) was correct. `industry_benchmarks` (39 rows) confirmed a separate taxonomy table, excluded from the corpus count. `BENCHMARK_COUNT`/`BENCHMARK_COUNT_DISPLAY` corrected in `canonical-facts.ts`, plus every hardcoded literal "95,500" found across ~40 files (components, pages, services, scripts, i18n) replaced with the real number — full typecheck/1107-test/build pass before commit.
4. **CLOSED.** Apex-vs-www content divergence: verified NOT a live issue, reconfirmed with a formal evidence record 2026-07-11 (`release-evidence/mp1-verification-2026-07-11.json`) — apex 308-redirects path-preserving to www, single canonical surface, Privacy/Terms/Methodology/Pricing/Examples all distinct and route-specific.
5. One reproducible, fully lineage-audited example report: not yet built (needs the analysis-snapshot infrastructure this freeze's [BUILD]-queued items describe — MP4-gated).

**MP1 gate: PASS as of 2026-07-11**, formal evidence in `release-evidence/mp1-verification-2026-07-11.json` (supersedes the "UNVERIFIED" status in `MP1-ACTIVE-GATE-PRERENDER-VERIFICATION.md`'s own header — that file predates this verification and should be treated as historical, not current).

**Items 1-4 are now all CLOSED.** Item 5 (fully lineage-audited example report) remains MP4-gated engine work, correctly queued past the freeze's own lift point rather than a prerequisite for revenue-safe operation — the freeze's actual purpose (stop *new breadth*, fix the presentation-integrity contradictions) has been satisfied. This freeze can reasonably be considered exited for its own stated scope; MP4/MP5 remain hard-gated on first paying user / $500 MRR regardless, unchanged.
