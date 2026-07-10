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

Per the accuracy audit already completed 2026-07-10 (`MP-ACCURACY-AUDIT-AND-TODO-v1.0.md`) plus this freeze's own scope:

1. Payback-period bug in public examples: fixed for 1 of ~51 examples (commit `fbf3654d`); remaining examples not yet audited against the live ramp-aware engine formula.
2. "90% of businesses fail in 5 years" claim: still live on `MobileHero.tsx` and `BlogArticle.tsx` as of this freeze declaration — not yet retired.
3. 95,500-benchmark-vs-DB-row-count reconciliation: still an open decision (flagged since 2026-06-20, restated 2026-07-11) — not yet resolved.
4. Apex-vs-www content divergence: **verified NOT a live issue** (2026-07-11, direct `HttpWebRequest` check — apex 308-redirects to www, single canonical surface). No action needed here; this item closes the freeze checklist without further work.
5. One reproducible, fully lineage-audited example report: not yet built (needs the analysis-snapshot infrastructure this freeze's [BUILD]-queued items describe — MP4-gated).

The freeze lifts when items 1-3 are closed. Items requiring MP4-gated engine work (analysis snapshots, source registry, ingestion layers) remain queued past the freeze's own lift point, gated separately on first paying user — the freeze is about stopping *new breadth*, not a prerequisite for revenue-safe operation.
