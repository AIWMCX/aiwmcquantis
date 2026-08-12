# AIWMC Quantis — User Testing + Buyer Objection Lab

Evidence-class discipline per the mission brief: **expert walkthrough** = observed, real, mine. **Persona simulation** = hypothesis only, not run here (simulating a "founder reaction" and presenting it as signal would violate the brief's own opening rule). **Real participant test** = not run — I cannot recruit or observe real humans; that is exclusively yours to do.

## Part 1 — Expert walkthrough (real, observed, 2026-08-11)

Cold read of the live production homepage (`aiwmcquantis.com`), page text only (visual/screenshot verification wasn't available this session — noted per-finding where that matters). Applying Part A (comprehension) and Part C (trust) questions as an expert reviewer, not a simulated user.

### Finding 1 — Internal number inconsistency: "1,000-iteration" Monte Carlo vs. "97,500 scenario stress-tests per analysis"

The feature comparison table states Plus/Pro run "1,000-iteration" Monte Carlo. The Plus pricing card's own feature bullet says "97,500 scenario stress-tests per analysis" on the **same page**. These read as the same claim (how many simulated scenarios back one analysis) with two different numbers, 97.5x apart. A careful reader — exactly your target ICP (fractional CFO, consultant) — would notice this.

**Taxonomy**: `TRUST`, `ACCURACY_OR_CONSISTENCY`
**Confidence**: HIGH (direct text-level contradiction, not inference)
**Fix threshold**: Does not meet the 3-session bar (no sessions run yet), but this is a same-page self-contradiction independently verifiable without any user test — reasonable to treat as pre-qualified. Recommend: confirm which number is real (1,000 iterations of Monte Carlo? Or is "97,500" reusing the benchmark-corpus figure by mistake, copy-pasted into the wrong context?) and fix the wrong one.

### Finding 2 — Displayed price ($14/mo) doesn't match the actual monthly price ($17/mo)

The Plus tier card headlines "$14/mo — Save $36/year," but the fine print directly below the pricing table says: "New monthly signups today are billed at $17/mo with the option to switch to annual ($14/mo) anytime." A first-time visitor reading only the large card price (which is what people actually read) would expect $14/mo, not $17/mo, unless they also read the toggle state and the disclaimer. Same pattern on Pro ($41/mo headline, actual monthly price implied higher).

**Taxonomy**: `TRUST`, `PRICE`, `PAYWALL`
**Confidence**: MEDIUM — text-level evidence is solid; I could not visually confirm which toggle state (Monthly/Annual) is selected by default, which matters for how bad this actually is in practice. If "Annual" is the default toggle, the $14 price is arguably correctly labeled and this is a non-issue; if "Monthly" is default, this is a real bait-and-switch-reading risk.
**Fix threshold**: Not qualified yet — needs either a real session or a direct visual check of default toggle state before treating as confirmed.

### Finding 3 — Single global "Confidence: 79%" badge, unchanged from the problem this session's own open PR already targets

The live sample report ("The Draft Lab") displays "CONFIDENCE 79%" as one headline number, with a methodology page explaining it's a weighted blend of four sub-scores (benchmark match quality, assumption fragility, narrative coherence, cross-model agreement) — but the *report itself* only ever shows the single composite number, not the breakdown, anywhere in the extracted page text.

**Taxonomy**: `TRUST`, `ACCURACY_OR_CONSISTENCY`
**Confidence**: HIGH — directly observed on the live production sample report.
**Fix threshold**: Already qualified — this is the exact problem PR #27 (`accuracy/confidence-semantics-split`, open since 2026-08-04, still unmerged) was opened to fix. This walkthrough is independent confirmation the live site still has the old behavior; doesn't need a new fix invented, needs the existing PR finished and merged.

### Finding 4 — Free tier's "5 watermarked PDFs/day" vs. "5 analyses per month" — mismatched units in adjacent copy

The Free tier lists "5 analyses per month" as the core limit, then separately "5 watermarked PDFs/day" as a feature bullet. Per-day framing on a feature that can only ever be exercised 5 times total per month (since analyses themselves are capped at 5/month) is confusing — a reader could reasonably infer more daily headroom than actually exists.

**Taxonomy**: `POSITIONING`, `PAYWALL`
**Confidence**: HIGH (text-level).
**Fix threshold**: Not qualified (cosmetic copy issue, low material impact) — flagging as backlog, not active work.

### Finding 5 — Positive: "Show how this was produced" links exist on every headline metric

Each of the four hero metrics (Initial Investment, Payback Period, Monthly Profit, Confidence) on the sample report carries its own "Show how this was produced" link. This is a genuine, already-shipped trust-building affordance directly answering Part C's "where did this number come from" question — worth knowing this already works before assuming it needs to be built.

**Taxonomy**: n/a (working correctly)
**Action**: None. Noted so it isn't mistakenly re-built or miscounted as a gap in a future session.

### Finding 6 — Two visually distinct example analyses on one page, unclear if intentionally paired

The page shows both "The Draft Lab" full sample report (18-month payback, 79% confidence, Conditional Go) and a separate, shorter "Pre-Mortem Engine" demo panel with different numbers for what reads as the same coffee-shop-in-Austin archetype (14-month break-even, 9-month runway, Risk Score 78 CRITICAL, "you're priced 27% below market"). Text extraction can't confirm visual separation/labeling between the two — this needs an actual look at the rendered page, not just text, before treating as a real finding.

**Taxonomy**: `ANALYSIS_COMPREHENSION` (hypothesis only)
**Confidence**: LOW — flagged for follow-up visual check, not asserted as a confirmed defect.

## Part 2 — What I did NOT do, and why

- Did not run persona simulations claiming to be "a founder's reaction" — the brief's own first line prohibits presenting that as user validation, and a fabricated transcript would be indistinguishable from real evidence to anyone skimming this doc later. Not worth the risk.
- Did not fill in the "Required output" items 1 (session-by-session evidence beyond this walkthrough), 3 (buyer objections), 5-7 (conversion/subscription/repeat-use blockers), 8-9 (product/copy changes "justified by three-session evidence") — all require real participant data that doesn't exist yet. Inventing plausible-sounding entries for these would be the exact failure mode Rule 4 (no false proof) and this brief's own opening line both warn against.

## Part 3 — Ready-to-run session kit (for when you have real participants)

Saved so a real session can start in under a minute rather than needing this whole brief re-read:

### Recruiting mix (Aug 15 minimum: 5 sessions if possible, label sample size honestly if fewer)
- [ ] Founder with a decision in the next 30 days
- [ ] Operating SMB owner
- [ ] Independent consultant/advisor
- [ ] Fractional CFO / finance operator
- [ ] One mobile-first user

### Per-session script (read verbatim, do not lead)

**Part A — zero-context comprehension.** Show the homepage, no explanation. Ask: What is this? Who is it for? What would you use it for? What do you expect to receive? What makes you trust/distrust it? What would you click next?

**Part B — decision task.** Give them their own real decision. Observe (don't prompt): can they start an analysis; enter a complete case; understand missing inputs; identify assumptions; correct one assumption; understand base/downside/upside; find break-even/payback/runway; identify the fragile assumption; explain what evidence is missing; understand what would reverse the decision.

**Part C — trust test.** Ask: Where do you think this number came from? Which number do you trust least? Which number would you verify before acting? What would you need to see to show this to a client/partner/investor? Does the report look more certain than the evidence deserves?

**Part D — purchase test.** Ask (all of these, not just "would you buy this"): What would you do after receiving this analysis? Would you pay to have this reviewed before making the decision? What would make the $149 sprint worth it? What would make it not worth it? Would $17/$49/mo make sense for how often you'd use it? What is your current alternative? How much time/money does that alternative cost? Who approves the purchase? What would stop you from paying today?

**Part E — repeat-use test.** Ask: What would bring you back next week/month/quarter? Would you rerun the same business after assumptions change? Would a consultant use this for multiple clients? Would an evidence-change alert be useful or noise? What would have to update before a rerun is valuable?

### Instrumentation to record per session (minimal PII — segment/device/source only, no sensitive financials)

| Field | Value |
|---|---|
| Segment | |
| Device | |
| Acquisition source | |
| Task success/partial/fail (per Part B item) | |
| Time on task | |
| Errors/backtracks | |
| Assistance required | |
| Comprehension accuracy | |
| Trust before/after methodology explanation | |
| Willingness-to-pay signal | |
| Current alternative | |
| Exact objection (verbatim) | |
| Repeat-use trigger | |
| Next action | |

### Hole taxonomy (tag every finding)
`DISCOVERY` `POSITIONING` `TRUST` `INPUT_FRICTION` `ANALYSIS_COMPREHENSION` `ACCURACY_OR_CONSISTENCY` `EVIDENCE` `PAYWALL` `PRICE` `PAYMENT` `DELIVERY` `REPEAT_USE` `MOBILE_ACCESSIBILITY` `WRONG_ICP`

### Fix threshold (unchanged, worth re-stating so it isn't relaxed under pressure)
A new feature enters active work only if it blocks a paid delivery, the same material friction appears in 3+ qualified sessions, or it's a release/security P0. Everything else is hypothesis/backlog — including everything in Part 1 above except Finding 3, which already clears the bar via the existing open PR.
