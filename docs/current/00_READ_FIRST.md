---
document_id: QNT-00-READ-FIRST
title: Read First — Authority Order and Document Status Rules
status: active-spec
owner: AIWMC LLC
created_at: 2026-07-11
last_verified_at: 2026-07-11
verified_commit: bed9658d
verified_deployment: null
source_of_truth: true
expires_at: null
supersedes: []
superseded_by: null
---

# Read this before any other Quantis document

This file, plus the evidence in `release-evidence/`, is where any session
(Claude, Lovable, ChatGPT, or a human) should start. Do not start from the
full historical `docs/` folder — most of it is planning, proposal, or
historical material, not proof of current state.

## Authority order

1. Live production evidence generated during the current run (a fresh
   `curl`/HTTP fetch, a fresh DB query, a fresh test run) — highest authority.
2. Production database/configuration queries.
3. Repository at the deployed commit.
4. Generated manifests, evidence records (`release-evidence/*.json`), and
   test reports.
5. Approved active specifications (this file, `STABILIZATION_FREEZE.md`).
6. Historical documents (audits, handovers, master plans) — lowest authority.

**No prose handbook, plan, roadmap, or prompt overrides live production
evidence.** If a document conflicts with what you just measured, the
document is wrong or stale — update it, don't defer to it.

## Document status vocabulary

Every status-bearing document or claim uses one of:

`PROD_VERIFIED` · `CODE_VERIFIED` · `ACTIVE_SPEC` · `PLANNED` · `DISABLED` ·
`BROKEN` · `HISTORICAL` · `DEPRECATED` · `CONTAMINATED` · `UNVERIFIED`

Never write "probably fixed," "should be working," or "fixed" without a
literal evidence record backing it. `UNVERIFIED` is always the correct
default when evidence doesn't exist yet — it is not a failure state, it's
an honest one.

## Where evidence actually lives right now

- `release-evidence/mp1-verification-2026-07-11.json` — MP1 gate: **PASS**.
  Live HTTP checks (distinct body hashes, titles, Pro `$49` crawlable,
  8-Layer present / 7-Layer absent, apex→www path-preserving redirect,
  Privacy/Terms independently rendered). This supersedes the "UNVERIFIED"
  status still written in the header of `MP1-ACTIVE-GATE-PRERENDER-VERIFICATION.md`
  (a document from outside this repo) — that header is stale as of this file.
- `docs/STABILIZATION_FREEZE.md` — current freeze status and exit criteria,
  updated 2026-07-11 against live evidence, not left at its original
  2026-07-10 claims.
- `scripts/verify-payback-integrity.mjs` — runs in CI on every build; catches
  the specific proven payback-bug signature in example content.
- `scripts/verify-visibility.mjs` — runs in CI on every build; the fail-closed
  route-body-uniqueness gate (some external documents describe this as
  "queued" — it is not; it is built and has been running in
  `.github/workflows/ci.yml` and `seo-deploy.yml` for multiple releases).

## What does NOT exist yet in this repo (genuine gaps, not done)

- `docs/current/CURRENT_PRODUCTION_STATE.json` (a generated instance
  conforming to `AIWMC_QUANTIS_PRODUCTION_STATE_SCHEMA_2026-07-11.json` —
  that schema file exists outside this repo as a spec; no conforming
  instance has been generated here yet).
- `docs/current/PRODUCT_MANIFEST.json`, `PRICING_ENTITLEMENTS.json`,
  `FEATURE_CATALOG.yaml`, `CLAIM_REGISTRY.yaml`, `FORMULA_REGISTRY.json`,
  `DATA_INVENTORY_SUMMARY.json`, `SOURCE_REGISTRY.md`, `MODEL_CARD.md`,
  `LIMITATIONS.md`, `RELEASE_GATES.yaml`, `OPEN_DEFECTS.json`,
  `RELEASE_EVIDENCE.json`.
- `docs/runbooks/`, `docs/specifications/`, `docs/archive/`,
  `docs/quarantine-wrong-product/` folder restructuring.
- `scripts/build-ai-context.mjs`.

These are real, legitimate future work — not urgent, and each should be its
own scoped slice (one document → implementation → commit → push → verify →
evidence → next), not built all at once.

## The one governing sentence

> Plans explain what should exist; production evidence proves what does exist.
