# Session Handoff — 2026-09-02

**Production SHA (verified live):** `2190fd5d8f6024eb882234ab6a074722918295cf`
**paid_engagements rows (all-time):** 0 — no real or test payment has occurred yet.

## What shipped and is verified live today

All four confirmed by fetching the actual deployed JS chunks from `www.aiwmcquantis.com`, not just route 200s:

1. **Terms §4.5** — Founder-Assisted Paid Engagements section (`Terms-D64h-yh4.js`)
2. **Refund Policy** — engagement-specific carve-out, replacing the old subscription-only 14-day language for $349/$499 buyers (`RefundPolicy-Beh5DLjH.js`)
3. **Privacy** — intake-data disclosure bullet (`Privacy-DmoZkaDv.js`)
4. **`/engagement-intake`** — expanded field set (company/industry/financial context, founder-only fields, Stripe-prefilled email) (`EngagementIntake-OyifDEVv.js`)

Negative-path tests run directly against the live functions today, all correct:
- `engagement-intake` with missing `session_id`, fake `session_id`, missing `action`, malformed JSON body → all rejected cleanly, no crash, no data leak.
- `engagement-checkout` with an invalid `offer_code` → rejected. Both valid offer codes (`founder_decision_review`, `consultant_founding_pilot`) → resolve to live, working Stripe Payment Link URLs (confirmed 200 on the actual `buy.stripe.com` links).

## Known, unresolved blocker — start here tomorrow

**The Supabase `deploy_edge_function` MCP tool is broken in this environment.** Every invocation — regardless of payload — fails with:
```
ZodError: verify_jwt expected boolean, received string; files expected array, received string
```
This reproduced identically across 4 separate attempts on 2 different days (2026-09-01 and 2026-09-02), including after reloading the tool's schema via ToolSearch (which itself came back as an empty `{type:"object"}` shell — the connector isn't exposing its real parameter schema). This is an infrastructure/connector fault, not a payload-formatting issue — do not spend more time reformatting the call.

**Two backend changes are written, committed, and code-reviewed clean, but NOT deployed to Supabase:**
- `supabase/functions/engagement-checkout/index.ts` — adds best-effort `consent_collection: { terms_of_service: "required" }` on the Stripe Payment Links.
- `supabase/functions/engagement-intake/index.ts` — accepts/stores the expanded intake fields into `intake_data`, resolves `contact_email` with a Stripe-verified fallback, and sends a best-effort owner-notification email via Resend (`RESEND_API_KEY`/`OWNER_NOTIFICATION_EMAIL`) after a successful paid intake.

**This does not block selling.** The currently-live versions of both functions (pre-dating today's edits) already do correct server-side price/tier verification, session-bound redirect, and idempotent/locked intake — verified by read and by live negative-path testing today. A real $349/$499 sale would work correctly right now; you'd just need to check `paid_engagements` manually instead of getting an email ping, and buyers won't see an explicit Stripe consent checkbox (Terms are still linked and stated elsewhere).

## Tomorrow's scope, in priority order

### 1. Unblock and finish the deploy (15–30 min)
- First 5 minutes: just retry `deploy_edge_function` for `engagement-checkout` then `engagement-intake` once — connector may have recovered overnight.
- If still broken: deploy via the Supabase CLI or dashboard directly instead of the MCP tool (`supabase functions deploy engagement-checkout`, `supabase functions deploy engagement-intake` from a real terminal with the project linked), or via GitHub Actions if `deploy-edge-functions` job's `SUPABASE_ACCESS_TOKEN` gets refreshed — that job has been failing separately since it went stale (unrelated fault, already known).
- After deploy: re-run the four negative-path curl tests from today against both functions to confirm no regression, then confirm the consent checkbox appears on an actual Stripe Checkout page and the Resend email arrives (send a real test intake against a throwaway session first if possible, or verify structurally by code path).

### 2. Refresh `SUPABASE_ACCESS_TOKEN` in GitHub Actions secrets
This is the same root cause failing "Verify migration control plane" and "Deploy Supabase Edge Functions" jobs in `production-deploy.yml` on every run (confirmed failing again on both of today's runs, `33591927529` and `33593115740`). Frontend deploys still succeed despite this, so it hasn't been urgent — but it's the same class of problem as the MCP tool being unhealthy, and fixing it removes CI red noise that could mask a real failure later.

### 3. First real customer transaction
Per the standing rule from prior sessions (see [`2026-09-02-first-customer-delivery-checklist.md`](2026-09-02-first-customer-delivery-checklist.md)): do NOT treat an owner-funded payment as first revenue. Options in order of preference:
- Close a real warm external customer while personally monitoring, or
- Owner-funded transaction explicitly labeled and permanently excluded from revenue metrics in `paid_engagements` (internal QA only).

### 4. Decide and record: is the full engagement-lifecycle enum in scope?
The earlier FIRST-REVENUE LAUNCH MODE instruction specified a formal lifecycle enum (`PAID → INTAKE_PENDING → ... → CLOSED` + exception states). This was **not implemented** this pass — current state tracking is done through the existing `status`/`payment_status`/`intake_status` columns, which are sufficient for launch but not the fully unified state machine originally specified. Recommend deferring until after first real sale, since it's not launch-blocking by the user's own definition — but flagging explicitly rather than silently dropping it.

### Do not do tomorrow (per explicit prior instruction)
No unrelated feature work until the above closes and a real customer transaction has happened. The next action after these gates is customer acquisition and sales, not another development cycle.
