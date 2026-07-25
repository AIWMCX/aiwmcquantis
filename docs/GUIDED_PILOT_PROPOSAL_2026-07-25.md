# Guided-Pilot Offer Proposal
**2026-07-25 — proposal for founder review, not implemented.**

## Why this, why now

Domain 10/13's own evidence this session: self-service checkout produced real paying customers who mostly churned with zero human touch, and every real signup is either founder-adjacent or a single-use, non-returning account. Domain 13 already concluded (in a prior session) that a founder-led guided pilot is the evidence-backed answer to "what's the smallest paid offer that proves value before a subscription relationship" — but confirmed this session via direct grep: **it has zero implementation anywhere in the codebase.** It's a recommendation, not a product. This proposes the smallest real version of it.

## What already exists to build on

- A real, live, correctly-scoped money-back guarantee (`GuaranteeBanner.tsx`/`RefundPolicy.tsx`) — "14-day money-back, no questions asked" — for the current subscription product. The same pattern (satisfaction-based, non-outcome-based) is directly reusable for a pilot guarantee; no new legal/copy pattern needs inventing.
- The deterministic engine, PDF export, and assumption-editing UI are all real and already produce a genuine deliverable — the pilot doesn't need new product surface, it needs a new *wrapper* around what exists (scope, delivery, and a human touchpoint).
- Domain 12's prospect call/intake script (already written, `PROSPECT_INTAKE_SCRIPT_2026-07-20.md`) is the natural front door to this offer.

## Proposed scope (answers Domain 13's Q123/Q124 gaps directly)

**Included** (the four things Q123 asked for, made concrete):
1. A 20-minute intake call using the existing prospect script — captures the real decision, the capital at risk, and the timeline (the exact structured-intake gap found in Domain 4's Q40).
2. One guided Quantis analysis, run live or asynchronously by the founder using the real engine (no new calculation logic needed) — with the assumption-editor's caveat (P0-26, now labeled) explained verbally rather than silently.
3. A reviewed, annotated PDF report — the founder adds 2-3 sentences of professional judgment the deterministic engine can't produce (the exact human layer Domain 8/17's trust findings show the raw numbers can't carry alone).
4. One revision within 7 days if a key assumption was wrong at intake.

**Explicitly excluded** (the boundary Q124 flagged as missing):
- No legal, tax, or investment advice.
- No guarantee of business outcome — only the guarantee that the deliverable above is provided (mirrors the existing subscription guarantee's exact framing).
- No open-ended consulting scope — one revision, not an ongoing engagement.

## Price and delivery

$99-149 (Domain 13's own range), one-time. Delivery: Calendly-style booking (no new checkout infrastructure needed for v1) → Stripe Payment Link (not a new subscription price tier, avoids touching `tiers.ts`/entitlement logic at all) → manual founder delivery for the first 5-10 pilots.

## What this deliberately does NOT require building yet

- No new landing page, workspace, or client-management UI (Domain 16's finding that no dedicated ICP landing page exists is real, but building one before validating the offer itself would be solving the wrong problem first).
- No changes to the subscription/entitlement system.
- No new database tables — a Stripe Payment Link plus a manual tracking sheet is enough to validate demand before investing in product surface.

## Recommendation

Run this manually for the first 5-10 buyers before writing any code beyond a payment link and a booking calendar. Domain 20's own milestone sequence (10 qualified prospects → 5 guided cases → 3 valid trusted outputs → 2 second-case users → 1 unrelated paying customer) is the right proof-before-build gate — this proposal is scoped to get through step 2 with the least possible engineering investment.
