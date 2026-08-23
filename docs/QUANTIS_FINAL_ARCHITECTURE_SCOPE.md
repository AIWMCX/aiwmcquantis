# AIWMC Quantis — Final Production Architecture & R&D Implementation Scope

**Created:** 2026-08-21
**Status:** Governing scope of record. Supersedes the Track A/B/C framing in `QUANTIS_RD_SCOPE_2026-08-21.md` (kept as historical context, not contradicted — the Gate I/II/III/IV model and the "don't cite stale evidence" discipline both carry forward unchanged into Workstreams/Phases below). GTM question bank (`QUANTIS_GTM_QUESTION_BANK.md`) stands as-is, feeding Phase 5/Workstream Y.
**Observed `main` at time of writing:** `8b7faf11468dc6015ceeccbbc58ecc7b1e89701b` — per this doc's own Workstream A invariant, this is *observed*, not assumed production. See §Session-verified status below for what's actually been confirmed.

This document preserves the full 35-section scope as given, with one addition: every item that this session has already independently investigated or fixed is marked inline, so tomorrow doesn't redo settled work or, worse, assume unsettled work is done.

---

## 1. Program outcome

Complete only when Quantis can be operated without repeatedly asking whether: deployed code equals repo code; Supabase schema equals migrations; a security policy silently failed; Stripe payment equals entitlement; an AI model invented a number; a value was recalculated differently by another surface; PDF/dashboard disagree; an assumption has unknown provenance; an analysis is unreproducible; an analytics event disappeared; a "successful" analysis degraded internally; a stale public page shows another product version; an unsupported claim escaped to production; a new dependency introduced unacceptable risk.

**Target:** not zero incidents — known structural weaknesses removed, failures detected/isolated/rolled-back, financial truth reproducible, production observable, commercial workflows reliable.

## 2. Current research-based baseline

**Invariant:** `MERGED ≠ DEPLOYED ≠ PRODUCTION_VERIFIED`. No dashboard, Slack update, or agent report may collapse those states.

**Session-verified status of this invariant, today:**
- `main` HEAD = `8b7faf11...`. **VERIFIED as actually running in production**, not merely merged: `analyze-business`'s live `?health=1` endpoint returned `commit_sha: 8b7faf11468dc6015ceeccbbc58ecc7b1e89701b` on 2026-08-21, matching `git log` exactly. This is real deploy-fidelity evidence, obtained the way this doc's own Workstream A demands (a live endpoint, not a cached dashboard).
- The "Vercel failure" this doc's baseline references: earlier in this session, the `Vercel` GitHub check on multiple merged PRs showed `fail` with message *"Git author AIWMCX must have access to the project on Vercel to create deployments"* — this is a **known team-access/permission artifact, not a build or deploy failure** (Vercel's own git-integration deployment succeeds independently and separately from this bot-check; the actual site returns 200 and serves the correct commit per above). This should still be **explicitly documented and reconciled** in Phase 0's evidence capture rather than silently assumed benign each time — that's exactly the "collapsing states" this doc warns against, even in the reassuring direction.
- Do not treat the above as blanket production health — it covers exactly two facts (commit fidelity, homepage 200), not the full `/admin/system` matrix this doc calls for (that doesn't exist yet).

## 3–34. Architectural destination, Workstreams A–Z, Implementation Sequence, Freeze Line, Non-Goals, Estimated Hours, First Execution Order

Preserved in full as specified — no changes to the architecture, workstream list, phase sequence, freeze-line conditions, non-goals, or hour estimates. This is the governing technical spec; implement against it directly. (Full text as provided is authoritative; not reproduced verbatim a second time in this file to avoid drift between two copies — treat the original message as the source text for Workstreams A–Z and Phases 0–6 verbatim, this doc only adds status annotations and the reconciled tomorrow list below.)

## 35. Final definition of done

Unchanged: code + tests + security + migration + deployment + live verification + production evidence + observability + rollback + documented ownership + public truth. Final invariant: `Evidence → Observation → Assumption → Formula → Financial Metric → Scenario → Reconciliation → Locked Result → Explanation → Decision → Actual Outcome → Calibration`, versioned and provenanced at every boundary.

---

## SESSION-VERIFIED STATUS — reconciling §34's First Execution Order against actual session history

This is the part that matters most for "don't miss anything." Several items in the given First Execution Order are **already done** this session, in prior turns — tomorrow must not redo them, and must not assume the rest are done just because these were.

| # | §34 item | Status | Evidence |
|---|---|---|---|
| 1 | Resolve actual production SHA and the current Vercel failure | **PARTIALLY DONE** | SHA resolved and verified live (`8b7faf11...`, health-endpoint match). Vercel check explained (permission artifact, not build failure) but not formally documented as a standing, monitored exception — do that first thing tomorrow, don't re-investigate from scratch. |
| 2 | Verify `www`/apex/privacy/terms/methodology route behavior from raw production HTTP | **NOT DONE this session** | No raw-HTTP route audit has been run. Do this fresh. |
| 3 | Capture current production state into machine-readable evidence | **NOT DONE** | No `CURRENT_PRODUCTION_STATE.json`/`RELEASE_EVIDENCE.json`/`OPEN_DEFECTS.json` exist yet. First real deliverable of Phase 0. |
| 4 | Audit remaining `is_service_role()` nullable pattern | **PARTIALLY DONE** | Confirmed exploitable and fixed in `get_user_activation_score()` (PR #46) via `COALESCE(public.is_service_role(), false)`. Confirmed the same raw pattern exists, **unaudited**, in 4 other migration files (`20260818040000_restore_engagement_notifications_lifecycle_email.sql`, `20260814120000_p0_track_a_referral_function_access.sql`, `20260426174842_...sql`, `20260206003246_...sql`). Follow-up task chip `task_0b2b72d7` already spawned for this exact item — pick that up, don't re-discover it. |
| 5 | Complete CRON secret rotation and verify old value is no longer operational | **DONE** | PR #48 (CI sync) + direct `cron.alter_job()` update to all 4 jobs + live-verified: new secret returns HTTP 200, **old secret confirmed returns HTTP 401** in production. Nothing left to do here — do not re-rotate. |
| 6 | Harden Sentry Replay privacy | **NOT DONE** | No Sentry Replay config has been touched this session. Open. |
| 7 | Reclassify deployment/migration checks so `SKIPPED`/`UNVERIFIED` cannot appear as `PASS` | **PARTIALLY DONE, narrower scope than asked** | The migration-control-plane (`docs/MIGRATION_CONTROL_PLANE.md`, PR #44) already does exactly this for the **ledger/schema-contract** slice specifically: `verify-migration-ledger.mjs`/`verify-production-schema.mjs` run as a real CI gate (`verify-schema-contract` job) and fail the workflow on drift — confirmed passing clean on the last two real production deploys. The broader `/admin/system` surface and the CI-wide "no inferred green" reclassification (Workstream A/B in full) do **not** exist yet — this item is not closed, only its migration-ledger slice is. |
| 8 | Prove Stripe test lifecycle end-to-end | **NOT DONE** | No Stripe CLI/API access has been available in this session at all. Fully open, and blocked on connector access unless done as a code-only entitlement-resolver review instead. |
| 9 | Add Gitleaks | **NOT DONE** | Open. |
| 10 | Add initial Semgrep Quantis rules | **NOT DONE** | Open. Note: this session already found, by hand, one exact instance of the rule this doc specifically calls for (`NO SECURITY DEFINER authorization guard using nullable boolean logic without explicit COALESCE`) — that's independent confirmation the rule is worth writing, not a reason to skip writing it. |
| 11 | OpenTelemetry analysis tracing pilot | **NOT DONE** | Open. |
| 12 | fast-check + first critical financial properties | **NOT DONE** | Open. |
| 13 | Formula Registry v0 | **NOT DONE** | Open. Related, already-found evidence: two public example fixtures (`coffee-shop-denver`, `consulting-firm-new-york` in `src/pages/examples/exampleData.ts`) have payback numbers that don't reconcile against either simple divisor per the repo's own `verify-payback-integrity.mjs` — a live, real argument for why a formula registry with traceable `F-011 vX` identity matters, not a hypothetical. |
| 14 | AnalysisSnapshot contract | **NOT DONE** | Open. |
| 15 | CanonicalResult + LockedNumericPayload contracts | **NOT DONE** | Open. |
| 16 | Artifact-parity tests | **NOT DONE** | Open. |
| 17–19 | Decision Graph / EvidencePacket schema / Evidence Service shadow adapter | **NOT DONE** | Open — Gate II/Phase 3 territory, correctly sequenced after 1–16. |
| 20–21 | Orchestrator bake-off + promote winner | **NOT DONE** | Open — correctly sequenced last among build work. |
| 22 | Professional Decision→Scenario→Report→Share→Repeat workflow | **NOT DONE this session** (pre-existing partial implementation per repo, not re-audited) | Open, needs its own fresh audit before claiming any status. |
| 23–25 | Technical-readiness audit / freeze / shift to selling | **NOT REACHED** | Correctly last — Gate I is not green yet by this doc's own strict per-row definition (§4 of `QUANTIS_RD_SCOPE_2026-08-21.md`). |

### Additional session-verified facts relevant to Phase 0/1, not in §34 but worth carrying into tomorrow's evidence capture:
- Full test suite: 1391/1391 passing, 61/62 files (1 skipped file, 23 skipped tests) — as of the last full run this session.
- Full production build (`bun run build`) succeeds end-to-end including prerender/sitemap/SEO-visibility-gate, confirms "Pro $49 present" in static output.
- Two JS chunks exceed 500KB (`index-*.js` 923KB, `pdf-*.js` 1.46MB) — Workstream U (Performance) territory, not yet measured beyond this raw size fact (no LCP/p95/etc. yet).
- Live business volume, freshly queried (not historical): 0 new signups / 2 analyses created in the trailing 7 days, 24 active+trialing subscriptions unchanged across the last several days — real, current evidence that top-of-funnel volume is currently too low to diagnose traffic-vs-activation from data alone (feeds Workstream Y / GTM bank Q18).
- No `EXTERNAL_REAL`/`FOUNDER`/`QA`/`BOT`/`SYNTHETIC`/`DEMO` cohort classification exists anywhere in the schema — blocks GTM bank Q1 and materially discounts every raw funnel count above as contaminated-unknown until built.
- Analytics parity: 27 `analyses` persisted vs. 11 combined `analysis_completed`/`analysis_complete` `funnel_events` in a trailing 30-day window (~59% under-reporting) — a real, already-measured instance of exactly the "analytics parity" row Workstream A's `/admin/system` is meant to surface continuously.

---

## TOMORROW — reconciled execution order (supersedes the raw §34 list)

Skip items already DONE (5). Start items already PARTIALLY DONE from where they actually left off, not from scratch (1, 4, 7). Everything else proceeds in the given order, since the given order's dependency logic is sound and unchanged.

1. **Phase 0 baseline capture** — produce real `CURRENT_PRODUCTION_STATE.json` / `RELEASE_EVIDENCE.json` / `OPEN_DEFECTS.json`. Fold in everything already verified above (commit fidelity, test/build results, known Vercel-check artifact, the 5 items already confirmed open from the prior slice-recovery work) instead of re-deriving it.
2. Raw-HTTP route audit: `www` vs apex, `/privacy`, `/terms`, `/methodology`, `/pricing`, `/examples`, `/how-it-works`, `/app`, metadata, sitemap, structured data — this doc's own §22 flags a specific known discrepancy (apex still exposing an old product definition on `/privacy`/`/terms` while `www` shows the current 8-layer/$17/$49 definition) — confirm or refute that specific claim with fresh evidence, don't assume it's still true or already fixed.
3. Pick up task chip `task_0b2b72d7` (the 4 remaining `is_service_role()` call sites) — this is genuinely next, not a re-audit.
4. Formally document the Vercel-check-vs-real-deploy distinction as a standing, monitored exception (so it stops looking like a red flag on every future PR check).
5. Sentry Replay privacy hardening (`maskAllText`/`blockAllMedia` defaults, no raw analysis/financial/document/Stripe payloads in exceptions, identifiers only).
6. Gitleaks (pre-commit + PR scan + scheduled historical scan), with explicit attention to the credential classes this doc lists — this session's own cron-secret incident is direct proof this is worth doing, not theoretical.
7. Semgrep, starting with the `COALESCE`-on-`is_service_role()` rule (already proven necessary by item 3/4 above) plus the other listed architectural rules.
8. Stripe lifecycle — attempt live/test verification if connector access exists by tomorrow; otherwise fall back to the code-only entitlement-resolver and unknown-Price-ID-fail-closed review, and record that fallback explicitly rather than silently skipping the item.
9. OpenTelemetry server/Edge-Function tracing pilot (`quantis.analysis` trace + listed child spans).
10. fast-check install + first financial-invariant properties (start with the two already-known-broken example fixtures as concrete failing cases to encode, not synthetic ones).
11. Formula Registry v0 — register at minimum the payback formula first, since it's the one with a live, confirmed inconsistency to anchor against.
12. AnalysisSnapshot, CanonicalResult, LockedNumericPayload contracts.
13. Artifact-parity tests.
14. Everything from Decision Graph onward proceeds exactly as sequenced in §34/Phase 3+ — none of it starts before 1–13 above are real, not asserted.

Do not attempt Workstreams M–X (Decision Graph, Evidence Service, orchestrator bake-off, professional workflow completion, learning loop) tomorrow. That's Phase 3+ territory and nothing in Phase 1/2 is closed yet.
