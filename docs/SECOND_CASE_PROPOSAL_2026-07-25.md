# Second-Case / Repeat-Use Proposal
**2026-07-25 — proposal for founder review, not implemented.**

## The number this is answering

Every real, arm's-length signup that has ever touched Quantis has run **zero or one** analysis. Fresh SQL this session: 40 of 43 total users have run **zero** analyses, ever. Only 3 accounts have run more than one, and all 3 are the founder or founder-adjacent test-pattern emails, not independent customers. The one genuine paying customer traced (Plus, active) has run 0 analyses in two weeks. Second-case rate among real customers: **0%**.

This is the single largest unanswered risk in the product right now — not a bug, a behavior pattern. Nothing below is a guess at "why"; it's a menu of concrete mechanisms, each scoped, each with an honest cost/risk read, for you to pick from or reject.

## What already exists to build on

- `analysis_snapshots` — dataset-versioning is live and accumulating (fixed 2026-07-19). A stored snapshot means a "your assumptions changed, here's the delta" nudge is technically feasible without re-running anything from scratch.
- `check-lifecycle-emails` / `send-weekly-insights` — both real, correct, previously-orphaned edge functions, now scheduled (fixed today). They exist to do exactly this job (48h/96h nudges, 7-day reengagement) but have never fired in production. **This is the cheapest lever already pulled** — worth watching its effect for 1-2 weeks before building anything new.
- `scenario_compared` / `assumption_changed` funnel events — real, fire live, but nothing aggregates them yet (Domain 9 finding). Cheap to report on before building new instrumentation.

## Three mechanisms, ranked by effort

### 1. Watch the lifecycle emails first (no new work)
The scheduled emails just started firing today. Before building anything else, get 2 weeks of real signal: does `reengagement_step_1` (7+ days inactive) produce any second-case behavior at all? If it does, that's the cheapest possible answer. If it doesn't, that's real evidence the problem isn't "nobody reminded them" — it's something structural about the offer or the trigger.

### 2. A "second scenario, one click" affordance on the first report
Instead of waiting for an email, put the ask where attention already is: on the first analysis's results page, a visible "Run this again for a different location / pricing / team size" CTA that pre-fills the form from the just-completed analysis (cheap — the data already exists in `analysis_snapshots`). This targets Domain 3/8's finding that Quantis currently gives no obvious reason to return — it manufactures one, on the spot, when the user is already engaged.
**Cost**: small — one new component, one pre-fill wire-up, no new backend.
**Risk**: low. Doesn't touch financial calculations.

### 3. A real "what changed since your last analysis" digest (needs the outcome-tracking gap closed first)
`analysis_outcomes` exists but is empty (Domain 15 finding) — there's no mechanism yet for a user to report what actually happened, so there's nothing to compare a second run against. This is the most valuable long-term mechanism (a report that says "rent went up 8% in your area since March, here's the new number") but it depends on solving outcome-tracking first, which is its own project, not a quick add.
**Cost**: large — needs an outcome-capture UI, a comparison engine, and real users willing to report back.
**Risk**: medium — a comparison feature built on 0 real outcome reports so far would need a cold-start plan.

## Recommendation

Do nothing structural yet. Watch #1 (already shipped) for two weeks. If it produces any movement, that's your answer and it's nearly free. If it doesn't, build #2 next — it's cheap, safe, and targets the exact moment (right after the first report) when a user is most likely to try a second scenario. Reserve #3 for after outcome-tracking has real data to work with; building it now would be building on an empty table.
