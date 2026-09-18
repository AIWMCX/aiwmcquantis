# AIWMC Quantis — Master Reconciled Execution Plan

Built by reconciling six founder-supplied documents (Astra 6 Executive Prompt
Pack, GPT-6 Astra Prompt Pack, Quantis vNext Design Preview Master Prompt,
Free-Tier/Dashboard Master Plan v2.0, September 2026 Executive Prompt Pack,
and this session's own live production audit, PRs #146-151) against **verified
current production state**, not against what any single document assumed.
Where documents disagreed, the newest, most-verified source wins, and the
conflict is stated explicitly rather than silently resolved.

## 0. The one finding every document converges on

**A Plus subscriber cancelled specifically because they didn't understand the
dashboard — not price, not product depth.** This is not a hypothesis; it's in
the Master Plan v2 as a confirmed, named event. It is the single highest-
leverage fix in the entire body of work because it reverses revenue *already
won*, and every other funnel improvement (free-tier acquisition, GTM,
content) dumps users into the same confusing dashboard downstream. Fixing
acquisition before this just moves the leak, it doesn't close it.

Competitive grounding (searched today): freemium SaaS converts free→paid at a
median of 4.5%, top quartile ~8-22% depending on trial mechanics. SEO and
paid acquisition reliably bring traffic but do not fix activation confusion —
paid ads specifically are not the first-customer channel in any documented
2023-2026 bootstrapped case. This confirms the sequencing both master-plan
documents already chose: **fix comprehension before scaling acquisition.**

## 1. Reconciling the documents against each other

| Question | Master Plan v2 (earlier) | Sept 2026 pack (later) | Verified live tonight | Resolution |
|---|---|---|---|---|
| Free quota | "Pending 3→5, ship Phase 3" | "Already verified live, PR #124, Sep 11" | Confirmed via `useRateLimit.ts`, `tiers.ts`, `WelcomeModal.tsx`, `PricingSection.tsx`, and a standing regression test (`production-freeze.test.ts` explicitly guards against "3 free analyses" recurring) | **Done, not a task.** Sept 2026 pack and live code agree. |
| Error boundaries on dashboard panels | "Pending" in acceptance table | Not addressed directly | `SectionErrorBoundary` component exists and is already wired into `AppDashboard.tsx` in at least 2 locations | **Partially done, not zero.** Needs an actual coverage audit (which of the 6 panels are wrapped), not a from-scratch build. |
| Emoji icons in sidebar/industry selector | "Confirmed issue #1 and #4" | Not addressed directly | Confirmed still live: `QuickIndustryPicks.tsx` (6 emoji, labeled pills) and scattered emoji in 7 files total, including `AppDashboard.tsx` (1 decorative instance in a button) | **Real, still open.** The exact sidebar-navigation emoji the audit describes ("mixed with real SVGs") was not isolated tonight — needs one targeted grep pass at session start, not a guess. |
| Dashboard redesign scope | 17-issue audit, full visual system | Reframes around "one decision workspace," six tools with plain-language names, decision-first IA | Neither fully verified live | Sept 2026 pack's framing (workflow coherence) should govern *intent*; Master Plan v2's 17-issue table should govern the *concrete fix list*. They're compatible, not competing. |
| vNext Design Preview | N/A | N/A | Not started | Correctly scoped as an isolated, non-destructive `/preview-vnext` route per its own spec — this is **P2/LATER** work, not something to rush into production. Do not confuse "redesign the whole visual system" with "fix the 8 confirmed comprehension bugs." They are different sizes of effort with very different urgency. |

## 2. What's actually already shipped (this session, verified live in production)

Not theoretical — each confirmed via direct HTTP/browser check against
`www.aiwmcquantis.com`, not just a green CI checkmark:

1. **CSP conflict fixed** (PR #147) — two independent Content-Security-Policy
   declarations were fighting each other, silently blocking GA4 and Apollo
   tracking. Confirmed live: scripts load, no console errors.
2. **"Deterministic Business Validation" positioning fixed** (PR #147) —
   contradicted the stochastic Monte Carlo engine; corrected sitewide.
3. **5 routes with broken SEO metadata fixed** (PR #149) — `/pricing`,
   `/consultants`, `/research`, `/privacy`, `/terms` were silently falling
   back to generic auto-generated titles/descriptions instead of their real
   copy, due to a build-script parser bug. `/pricing`'s title didn't even
   state its own price. Confirmed live per-route.
4. **`bot-detection` edge function deployed for the first time** (PR #150) —
   written 2026-09-05, never added to the CI deploy list, silently dark for
   12 days. Confirmed live: function now deploys automatically, endpoint
   responds.
5. **GA4 measurement beacon fully unblocked** (PR #151) — the CSP fix in
   PR #147 let the *script* load but not the actual `/g/collect` event
   requests; found and fixed the remaining gap. Confirmed live: real
   completed network round-trips, zero CSP violations.
6. **Dead duplicate database read removed** (PR #151) — `MobileHero.tsx` was
   independently re-fetching a count already correctly fetched and displayed
   by `LiveCounter.tsx`, into state that was never read.

**Practical effect**: real analytics data collection (GA4) starts from
tonight, not before. If you check Google Analytics tomorrow and see near-zero
historical data before today's date, that is explained and expected — the
tracking was broken, not the traffic.

## 3. What's still open — prioritized by leverage, not by document order

### P0 — This week, before anything else (small, safe, high-leverage)

1. **Isolate and fix the real sidebar-navigation emoji icons.** Tonight's
   session confirmed emoji exist in 7 files but did not isolate the exact
   sidebar-nav component the audit describes. First task of the next
   session: `grep` the actual app-shell sidebar component (not
   `AppDashboard.tsx` itself — check for `AppSidebar`, `Sidebar`, or
   `Nav` components under `src/components/`), replace with Lucide icons,
   20px, single stroke weight, matching Master Plan v2 §1.2 exactly.
2. **Audit actual `SectionErrorBoundary` coverage.** It exists and is
   partially wired — confirm which of the 6 dashboard panels are actually
   wrapped versus which still show raw red error text on a component
   crash. Close the gap, don't rebuild what's already there.
3. **Lock icons on gated sidebar items for guests.** Confirmed unaddressed.
   A guest clicking Documents/Invoice Creator/Templates/Settings/Billing
   gets redirected to `/auth` with zero context — reads as broken, not gated.
4. **Fix the Step 1/Step 2 color inconsistency and the pre-input red "0/100
   UNCERTAIN" quality donut.** Both manufacture anxiety before the user has
   done anything wrong — a named, specific UX defect, not a vague "polish"
   ask.
5. **Make the primary "Run Analysis" CTA sticky.** Confirmed it sits below
   the fold on most screens — the single most important button on the page
   is not reliably visible.
6. **Promote Analysis History into the persistent sidebar.** Confirmed
   currently buried at the page bottom — directly implicated in the
   cancellation: a paying user who can't find their own past work has a
   rational reason to question what they're paying for.

Each of these is independently small, testable, and reversible — exactly the
shape of change this session has been shipping all night (single-file or
few-file, verified live, no Stripe/entitlement/backend risk). None of them
touch billing, auth logic, or the calculation engine — they're explicitly
protected by the Revenue Protection Guardrails in Master Plan v2 §0.1, which
remain correct and should stay in force.

### P1 — Next 1-2 weeks, after P0 is live and verified

7. Post-run activity strip (what the engine actually did, persists as a
   trust artifact) and the one-time panel-tour tour.
8. Collapse optional/advanced input fields behind a closed-by-default
   "Add more detail (optional)" expander — progressive disclosure.
9. Visible-locked paywall pattern (show the real UI + blurred/watermarked
   preview, fire the upgrade modal only on the action that needs payment)
   replacing hard gates, per both the Sept 2026 pack's "value before payment"
   principle and Master Plan v2 Workstream 3.
10. The 3-minute-unassisted-Plus-user acceptance test from Master Plan v2
    §1.5 — hand a fresh Plus account to someone with zero product exposure
    and no verbal instruction; they must find and use PDF export, Document
    Studio, and Location Comparison within 3 minutes. This is the actual,
    measurable proxy for "would this have prevented the cancellation" — run
    it after P0+P1 ship, not before.

### P2 — Weeks 3-4, only after P0/P1 are shipped and measured

11. `/pre-mortem` standalone acquisition route (no auth, shareable, counts
    against the shared 5-run pool) — the free acquisition product both
    master-plan documents specify.
12. Engagement scoring + PQL threshold → CRM trigger; abandoned-checkout and
    re-engagement email triggers.
13. The full vNext Design Observatory visual system — correctly scoped as an
    isolated, non-destructive preview route. Do not let this compete for
    time against P0/P1; it's real work but it's not what's costing revenue
    right now.

### Do not build yet

- Anything requiring new paid infrastructure.
- Paid acquisition/ads — confirmed by both internal docs and tonight's
  external research to be the wrong lever before P0/P1 land.
- A rebuild of anything Master Plan v2 §0.1 explicitly protects (Stripe
  price IDs, webhook handlers, checkout flow, the `TIERS` entitlement
  logic, the deterministic calculation engine).

## 4. Founder actions only you can do (not code)

- Deploy `bot-detection`'s continued health is now automatic via CI — nothing
  pending here anymore.
- Get a Sentry DSN (still never configured — zero production JS-error
  visibility exists right now, separate from tonight's CSP fix).
- Check Vercel's dashboard directly for env-var warnings (this session's
  Vercel MCP tool dropped mid-session and never reconnected — genuinely
  unverified, not just deprioritized).
- Run the 3-minute unassisted-Plus-user test yourself once P0+P1 ship — no
  one else can do this one for you; it's the real evidence gate.

## 5. Operating discipline going forward (from the Astra 6 / Sept 2026 packs, already proven correct tonight)

Every session, in this order: re-verify current state before trusting any
document (including this one) → implement the smallest coherent slice →
verify live in production, not just green CI → log the delta → move to the
next item. This is exactly the pattern that shipped 6 verified fixes tonight
without a single rollback. Keep it. The moment this plan itself goes stale
against production, supersede it explicitly — don't let it join the pile of
contradictory documents this reconciliation just cleaned up.
