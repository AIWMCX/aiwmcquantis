# FULL_AUDIT — Session 1 (Establishing Truth)
Per `docs/growth/USER_TESTING_SEO_MASTER_PROMPT_v1.0_2026-07-25.md` Section 34: "The first session must establish truth. It must not create more pages, submit more directories, or modify production."

**Activation used:** `ACTIVATE: FULL_AUDIT / MODE: READ_ONLY / ENVIRONMENT: PRODUCTION_READ_ONLY / DEPLOY: NEVER`
**Date:** 2026-07-25. **No production changes made in this session** — all findings below are read-only evidence.

## 1. Access and evidence inventory

| Evidence source | Status | Note |
|---|---|---|
| Repository (full read access) | **YES** | |
| Production site (live browser access) | **YES** | Used directly for all findings below |
| Supabase production DB (read-only via MCP) | **YES** | Used extensively in prior sessions this week |
| Google Search Console | **UNKNOWN** | No meta-tag verification found on the homepage (`google-site-verification` absent) — this does not prove Search Console isn't set up (DNS/GA-linked verification wouldn't show in HTML), but it's the one signal checkable from here. **Needs founder confirmation: is Search Console connected, and can access be shared?** |
| Analytics dashboard (GA4/similar) | **UNKNOWN** | Event-level tracking code exists in the repo (`recordFunnelEvent`, GA4 mirror per `src/lib/analytics.ts`) and this session already queried raw `funnel_events` rows directly via SQL — but no dashboard-level (GA4 UI) access was available this session. |
| Directory submission register | **YES** | `src/data/directorySubmissions.ts` — built and reconciled to 71 entries this week, including the 2026-07-25 batch of 22 confirmed submissions from the founder. |
| Real user testing / recruitment | **NO** | Not available in this environment. Per the master prompt's own Section 6 rule, no simulated persona conclusions are presented as user-validated below. |

## 2. Directory status ledger (Section 10 of the master prompt)

Already built and current: `src/data/directorySubmissions.ts`, surfaced at `/directory-tracker`.

- **71 tracked, 35 live** (confirmed via live page read this session).
- The 2026-07-25 batch (22 new + 1 corrected) already includes most of the schema the master prompt asks for: name, url, proofUrl, type, drScore, status, submittedDate, notes. **Not yet captured**: UTM parameters on destination links, redirect-chain verification, per-directory referral session counts, follow/nofollow link attribute, and directory-page robots/canonical state — these require either analytics access or a manual per-directory check, not yet done.
- **Known gap flagged in that same session**: `SocialProofBar`-adjacent work found no evidence the homepage's directory-facing content mismatches; separately, the AffyList screenshot the founder shared earlier showed a generic placeholder image on the third-party listing — that's a third-party display issue (AIWMC Quantis doesn't control AffyList's rendering), not a Quantis-side defect. Confirmed the correct logo now exists in Quantis's own asset pipeline (`src/assets/aiwmc-quantis-icon-mark.png`) for any future re-scrape.

## 3. Production route + technical SEO check (Sections 11-15)

**`robots.txt`** (fetched live): correctly allows all public marketing routes, disallows `/app/` (private analysis subroutes) while explicitly allowing bare `/app` — a coherent, intentional split. Disallows `/admin`, `/auth`, `/dashboard`, `/checkout/`, `?ref=` and `?source=` parameter variants. **PROVEN, no defect found.**

**`sitemap.xml`** (fetched live): 88 URLs, all `https://www.aiwmcquantis.com/...`, no `/auth`, no private routes. `/app` bare route is included (consistent with robots.txt). **PROVEN, no defect found at this level** — this proves discoverability, not indexation (Search Console access would be needed to prove actual index status, marked `UNKNOWN` above).

**Homepage meta/structured data** (fetched live via DOM inspection):
- `canonical`: `https://www.aiwmcquantis.com/` — correct, self-referential, matches the canonical-host decision already on record.
- `robots` meta: `index, follow` — correct.
- 7 JSON-LD blocks present — not individually validated this pass (would need a structured-data validator run, flagged as a follow-up).
- `google-site-verification` meta: absent (see access inventory above).

## 4. NEW FINDING — P0: the exact "97,500 real benchmarks" overclaim survives in the static HTML shell, missed by the earlier fix

**This is the single most important finding of this session.**

A prior session task ("Retract remaining false '97,500 real benchmarks' claims") and this week's P0-24 fix both addressed the **React-rendered** hero/FAQ copy (changed "derived from" → "informed by", removed stray hardcoded source lists). Both were real, correct fixes — but neither touched **`index.html`** itself, which is a separate, static file that ships as the literal HTTP response before React ever mounts.

Confirmed live via direct DOM read of `https://www.aiwmcquantis.com/`:

- `<meta name="description">`: **"...AI-powered financial pre-mortem with 97,500 real benchmarks. Free to start."**
- `<meta property="og:description">` and `<meta name="twitter:description">`: identical text.
- The `<noscript>` fallback body (what a crawler sees if JS doesn't execute, and part of what search engines and social-card scrapers read): **"...Quantis does it in 90 seconds with 97,500 real benchmarks. Free."**

All four instances are hardcoded directly in `index.html` (lines ~124, 337-338, 356), completely bypassing the canonical-facts module (`src/config/canonical-facts.ts`) that the React components correctly import from. This is **the exact same class of defect** as P0-24 and the earlier "stray hardcoded source list" finding in `HowItWorks.tsx` — a second, more consequential instance, because this is what Google's search snippet and every social share card actually display, arguably more visible than the on-page hero text itself.

**Also found**: `scripts/generate-static-bodies.mjs` (a comparison-page content generator, e.g. `/vs/upmetrics`) contains a softer variant: "modeled numbers from real benchmarks" — worth a look in the same pass, lower severity than the meta-tag instances.

**Not fixed this session** — `MODE: READ_ONLY` was explicitly specified for this activation. Documented here per the master prompt's own evidence-first protocol; recommend activating `ACTIVATE: P0_FIXES` next specifically for this item, since it's a same-shape, same-risk fix to what already shipped safely twice this week (change 4 static strings in `index.html` + review `generate-static-bodies.mjs`, no schema/logic changes, no deploy without approval).

## 5. Combined risk list — Top 10, prioritized (Section 25 severity model)

| # | Finding | Severity | Status | Evidence |
|---|---|---|---|---|
| 1 | Static `index.html` meta description/OG/twitter/noscript still claim "97,500 real benchmarks" | **P0** | FAILED | Live DOM read, this session |
| 2 | No dedicated ICP/trigger landing page for directory or outbound traffic — every directory link lands on the generic homepage | **P1** | FAILED | Domain 16 (this week) — confirmed via full route table read |
| 3 | 99.4% of funnel events carried no UTM attribution until this week's fix | **P1 → improving** | FIXED (code), unmeasured (needs 2+ weeks of new traffic to confirm effect) | Domain 16 fix, `4525e116` |
| 4 | Zero real signups in the most recent 7-day window prior to this week's directory push | **P1** | PROVEN (as of last check) | Domain 10 fresh SQL |
| 5 | Search Console / GA4 dashboard access unconfirmed — cannot prove actual indexation or referral conversion from directories | **P1** | UNKNOWN | This session |
| 6 | Homepage's "Adjust Your Levers" interactive widget uses an arbitrary linear heuristic, not the real engine (labeled this week, not rewired) | **P2** | PARTIALLY FIXED | P0-26, `ed1b7dad` |
| 7 | No activation-ladder reporting layer — `scenario_compared`/`assumption_changed` events fire but nothing aggregates them | **P2** | FAILED | Domain 9 (this week) |
| 8 | Directory-level referral/conversion tracking (which directory actually produces a signup) not yet measurable | **P2** | UNKNOWN, blocked on item 5 | This session |
| 9 | Real second-case/repeat-use rate is 0% among arm's-length customers | **P1 (product, not SEO)** | PROVEN | Domain 3/15 (this week) |
| 10 | Structured data (7 JSON-LD blocks on homepage) not yet individually validated against visible content | **P2** | UNKNOWN | This session, flagged not verified |

## 6. Founder decisions needed

- Confirm whether Google Search Console is connected for `aiwmcquantis.com`, and whether read access can be shared (property inspection, index coverage, and query-performance reports all require it — everything downstream of "is it indexed" stays `UNKNOWN` without this).
- Confirm whether a GA4 (or equivalent) dashboard exists separate from the raw Supabase `funnel_events` table, for directory-level referral attribution.
- Approve `ACTIVATE: P0_FIXES` for finding #1 (static HTML overclaim) — same risk profile as this week's already-approved copy fixes.
- Real user testing (Section 6) requires actual participant recruitment — not something this session can manufacture; flagging as a real gap rather than substituting simulated personas as if they were validated research.

## 7. Next activation command

Recommended: **`ACTIVATE: P0_FIXES`**, scoped narrowly to finding #1 (the static HTML meta/OG/twitter/noscript overclaim) — smallest, safest, highest-visibility fix available. `ACTIVATE: TECHNICAL_SEO` (structured-data validation, full canonical/indexability matrix across all 88 sitemap URLs) is the logical follow-on once Search Console access is resolved.
