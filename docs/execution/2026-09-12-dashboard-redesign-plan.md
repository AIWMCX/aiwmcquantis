# AIWMC Quantis — Dashboard Redesign & Operating Cadence
Extracted from a pasted planning document, 2026-09-12. Transcribed faithfully;
flagged where a claim needs verification against actual current code before
acting on it (per this session's standing discipline — several other pasted
documents this session contained stale or unverified claims that turned out
to matter).

## Part 0.3 — Continuous Analysis Operating Cadence

Not a one-time prompt — a standing operating rhythm every work session on
AIWMC Quantis follows, so work never contradicts itself or duplicates
already-shipped changes.

| Step | Action | Why |
|---|---|---|
| 1. Re-scan | Before writing any new prompt or code, re-check: current repo state, current Supabase schema, current Stripe config, current live site behavior (click through it), and this plan's acceptance-criteria table for what's already marked done. | Prevents re-solving a solved problem or contradicting a shipped fix. |
| 2. Cross-reference | Check the plan's "What This Plan Does Not Change" list and the Revenue Protection Guardrails before scoping new work. | Prevents accidental scope creep into revenue-critical systems. |
| 3. Sequence check | Confirm the phase being started has its prerequisite phase's acceptance criteria green. | Prevents building Phase 3 UX on top of a Phase 1 bug that was never actually fixed. |
| 4. Execute | Implement the smallest coherent unit of the phase — one workstream item, not the whole phase at once. | Keeps each change reviewable and revertible. |
| 5. Verify live | Test the actual production (or preview) URL, not just the code diff. | A deploy can succeed while the runtime behavior still fails silently. |
| 6. Log the delta | Update the acceptance-criteria table with pass/fail and date. | Creates the running record so the next session's Step 1 re-scan has something authoritative to read. |
| 7. Next | Only after logging, move to the next item in phase order. | Maintains the non-contradiction guarantee across sessions, days, and weeks. |

This is a checklist, not a promise — run it literally, every session. **This
matches and reinforces the discipline already used throughout today's own
session** (verify against live prod/DB before trusting a pasted claim, one
narrow change per PR, confirm the actual deploy not just the merge).

## Part 1 — Dashboard Redesign: root-cause fix for the #1 confusion problem

### 1.1 The confirmed problem (per this document — not yet independently verified by me)

Claimed as a confirmed root cause, not a hypothesis: the `/app` analysis
dashboard is hard to understand on first use — hard enough that even the
founder sometimes struggles to find the right sequence of clicks. **A paying
Plus subscriber canceled specifically because they did not understand the
dashboard's capability and what to click.** Framed as a comprehension
failure, not a feature gap or a pricing gap — and called the single
highest-leverage fix in the plan, because it's actively costing revenue
already won (a completed upgrade, reversed by confusion).

**Verification note**: I have not independently confirmed the cancellation
reason or the "even the founder struggles" claim against any support ticket,
churn log, or session-replay data. Per the operating cadence above (Step 1:
re-scan before acting), this should be confirmed against real cancellation
records before treating it as fact rather than as this document's claim —
same discipline used earlier this session when a "22 real trial users"
figure turned out to be uninspected test-fixture rows.

### Why this comes before everything else in the app experience

Every other workstream (free-tier expansion, pre-mortem, onboarding,
engagement scenarios) routes the user INTO this same dashboard. Fixing
acquisition and then dropping users into an uncorrected confusing dashboard
just moves the leak downstream. Dashboard clarity is the foundation the rest
of this plan is built on.

### 1.2 Prior internal audit (per this document — 17 issues claimed, only 6 shown in what was pasted)

A design audit is claimed to already exist in project records, identifying
**17 specific issues** on the `/app` analysis page. Only 6 rows were visible
in the pasted screenshots (reproduced below verbatim). **The remaining 11 are
not in hand** — before executing on "the 17 issues," locate and read the full
audit source document, don't assume the other 11 match the pattern of these 6.

| # | Confirmed issue | Why it causes "I don't know what to click" | Fix |
|---|---|---|---|
| 1 | Sidebar icons mix real SVGs with emoji (🚗📄🔔 etc.) | Emoji read as decoration, not navigation — users don't recognize them as clickable category selectors | Replace all with one consistent Lucide icon set, 20px, single stroke weight |
| 2 | No lock icons on auth-required items (Documents, Invoice Creator, Templates, Settings, Billing) | Users click, get redirected to `/auth` with zero context, assume the app is broken, leave | 12px lock icon + "Sign in to access" tooltip on every gated sidebar item, for guests only |
| 3 | Step 1 uses an orange dot, Step 2 uses blue — orange reads as a warning | User hesitates on Step 1, unsure if something is wrong, before they've typed anything | Numbered circles, one consistent accent color; filled = active, checkmark = done, gray = upcoming |
| 4 | Industry selector is an unlabeled 2×4 emoji grid styled like tags, not choices | Users don't realize these are selectable inputs at all — the single most common "stuck" point | Card-style radio buttons with Lucide icons, clear selected state (blue border + tint) |
| 5 | Quality panel shows a red "0/100 UNCERTAIN" donut before the user has entered anything | Manufactures anxiety and a sense of failure at the very start of the funnel — before any input exists | Neutral gray state with "Start filling in details" until fields are populated; color only appears as earned |
| 6 | "Run Stress-Test" primary CTA sits below the fold on most screens | The single most important button on the page is not visible without scrolling — users don't know the... *(row cut off in source)* | Make the results/CTA panel sticky, or pin the CTA to the... *(row cut off in source)* |

**11 more issues from this audit are referenced but not included in what was
pasted — retrieve the full audit before treating "the 17 issues" as scoped.**

### 1.3 Design principles cited (partial table, page 3 of the source doc)

| Principle | Rationale | Applied fix |
|---|---|---|
| Command-first / low chrome (Linear pattern) | The best tools reduce visual noise so the one correct next action is unambiguous. | Reduce the number of simultaneously visible CTAs on the results page to one primary (clearly labeled, high contrast) and demote everything else to secondary/tertiary button styling. |
| Inference over interrogation | The best 2026 onboarding flows infer context from what the user already typed instead of asking more questions upfront. | If the user's business-description text already contains an obvious industry ("my coffee shop"), pre-select that industry card instead of leaving the whole 2×4 grid unselected and waiting. |

*(This table's top rows, before "Command-first / low chrome," were cut off in
the source and are not reproduced here — retrieve the full page before
treating this principles list as complete.)*

### 1.4 The corrected `/app` dashboard — what a first-time user sees, in order

The concrete redesign sequence, combining the audit fixes and the design
principles into one first-run path. Replaces the "Tool Discovery Hub"
concept from an earlier v1.0 draft by making the Discovery Hub the literal
first screen inside `/app`, not a separate concept.

| Zone | What's there | First-time behavior |
|---|---|---|
| Sidebar (persistent) | Lucide icons only, no emoji. Lock icons + tooltip on gated items for guests. Analysis History promoted here as its own item. | Guests see exactly which items need sign-in before they click, not after. |
| Top-left primary zone | Single business-description textarea, pre-focused, cursor blinking, placeholder example text visible. | F-pattern: this is the very first thing the eye and the cursor land on. |
| Industry selector | Card-style radios with Lucide icons, auto-pre-selected if inferred from the description text. | One click confirms instead of requiring a cold choice from 8 unlabeled icons. |
| Step indicator | Numbered circles, single accent color, checkmark on completion. | No warning-colored dot before the user has done anything wrong. |
| Optional detail section | Collapsed by default behind "Add more detail" — improves confidence by up to 40% (optional, per source) | Progressive disclosure — the form does not look intimidating on first paint. |
| Quality indicator | Neutral gray bar reading "Start filling in details" until data exists; becomes a bar (not a red donut) that fills as fields complete. | Removes the anxiety-inducing 0/100 red state entirely. |
| Primary CTA | Sticky "Run Analysis" button, always in viewport, single highest-contrast button on the page. | Never below the fold; never ambiguous which button matters most. |
| Post-run: activity strip | Persistent log of what the engine did (benchmark match → classification → Monte Carlo → risk flags). | Builds trust in what "90 seconds" actually did — before the result even renders. |
| Post-run: panel tour | One-time highlight sequence across the 6 dashboard panels (from an earlier v1.0 "Workstream 5"), each panel's tooltip sourced from the info-icon copy already specified in that workstream. | Ties this redesign directly back into the onboarding workstream — one system, not two. |

## Before executing any of this (per the plan's own Step 1 re-scan)

1. **Find and read the full 17-issue audit** referenced in 1.2 — only 6 of 17 rows were pasted. Locate it in project records (the doc references it as already existing) before scoping work around "17 issues."
2. **Verify the cancellation claim** in 1.1 against actual churn/support data, if such records exist — don't build the whole plan's justification on an unverified anecdote.
3. **Read the actual current `src/pages/App*.tsx` / dashboard component source** to confirm which of the 6 (or 17) issues are still present today, since this plan may itself be written against a slightly earlier version of the dashboard than what's live now — the operating cadence's own Step 1 demands this before writing new code against it.
4. **Locate "What This Plan Does Not Change" and "Revenue Protection Guardrails"** — referenced in Step 2 of the cadence but not included in what was pasted. Get these before scoping Phase 1 work, since they're the explicit scope boundary.
5. **Confirm Phase 1's own prerequisite** (Step 3 of the cadence: "confirm the phase being started has its prerequisite phase's acceptance criteria green") — this plan calls itself Part 1, implying a Part 0 exists with its own acceptance gate; that gate isn't in what was pasted either.

## Recommended order for tomorrow

1. Retrieve the missing pieces (items 1, 2, 4, 5 above) before writing any dashboard code — this is exactly what the plan's own operating cadence prescribes, and skipping it risks re-solving something already fixed or building on top of a still-broken prerequisite.
2. Once retrieved, verify item 3 (current dashboard source) directly.
3. Then implement the 6 confirmed issues one at a time, each as its own small PR (matches this session's whole day of practice) — sidebar icon set first (issue 1), since every other fix in the corrected-dashboard table depends on the same icon system being in place.
4. Do not build the full "corrected dashboard" table in 1.4 as one PR — it's nine zones; each is its own reviewable, revertible unit per the cadence's own Step 4 ("smallest coherent unit... not the whole phase at once").
