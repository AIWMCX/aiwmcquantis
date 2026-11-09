# Quantis: the 8-month context (core operating rule since 2026-11-08)

The founder's rule: **every push, commit, merge, improvement, test, experiment and new document must carry the full 8 months of Quantis history.** No change ships unless it is justified against what has already been tried, what was measured, and what we still don't know.

The one question this rule serves: **will Quantis get users, customers, paid users and revenue, or should it close?** Work that doesn't help answer it waits.

Sources (local, founder's PC): `quantis-audits/validation-2026-11-08/` (VALIDATION-REPORT.md plus evidence, activation, technical, outreach and history files). Labels: MEASURED = read from production, Stripe, Google, git or the mailbox; INFERRED = judgment with a stated reason.

## 1. Timeline (MEASURED)

| Date | Event |
|---|---|
| May 2025 | Lovable prototype |
| Jan 17-18, 2026 | Public launch. January was the only month with paid ads (297 paid sessions, 1 key event) |
| Apr 14, 2026 | First cold email (personal Gmail). Apr 21-22: about 7 more, 6 bounced |
| Jun 12 - Sep 17 | GA4 blind (measurement outage) |
| Jun 19 - Sep 27 | 1,052 Zoho leads created; sending unverified |
| Jun 22 - Aug 17 | Migration pipeline broken |
| Jun 27 - Jul 21 | CI frozen |
| Jul 24 | Last Stripe webhook event recorded |
| Aug 30 | About 20 personal-Gmail emails to fractional CFOs and M&A advisors, 0 replies |
| Sep 9 | Last outside sign-up |
| Sep 28 - Nov 6 | 408 pipeline emails from hello@, 16 bounced, 0 human replies |
| Oct 9 | Technical work freeze declared; 51% of all PRs were merged after it |
| Nov 8 | Full validation review; this rule adopted |
| Dec 11 | YC decision date |

## 2. Baselines every change is measured against (MEASURED, as of 2026-11-08)

| Metric | 8-month value |
|---|---|
| Revenue from outside buyers | **$0** (the only 2 successful charges are the founder's own $17) |
| Outside accounts ever | 5 (4 independent); last on Sep 9 |
| Activated users (finished an analysis, saw the result) | **0 since July** |
| Returning users | 0 |
| Cold emails | about 436 (Apr 14 - Nov 6), **0 human replies**, 0 meetings |
| Buyer conversations or interviews | **0** (`commercial_call_briefs` empty) |
| Outside sessions Jun 4 - Nov 7 | 966; 77% did one thing; at least 17% crawlers |
| Google Search Apr 5 - Nov 6 | 16 clicks, 811 impressions, falling |
| GA4 Jan 1 - Nov 7 | 4,830 sessions, 4 key events |
| $349 / $499 offer pages | 42 sessions since Oct 25, 0 real checkouts |
| LinkedIn | 30 autoposter posts, 15 hand comments, 0 outcomes recorded |
| Product size | about 212k lines, 81 edge functions, 150 tables (60 empty), 27 admin pages; 4 of 32 features ever used by an outside person |

## 3. The findings (cite them by ID in every PR and document)

| ID | Finding | Evidence type |
|---|---|---|
| **F1** | Nobody was ever asked: 0 buyer conversations in 9 months | MEASURED |
| **F2** | The free analysis answers the wrong question: a hire is modeled as a whole new business | MEASURED |
| **F3** | Outreach went to the wrong people (88% fractional CFOs, 38% generic inboxes, 0 verified 11-200 owners), with the wrong ask, and probably wasn't seen (no DKIM on the first 305, placeholder "Re:" subjects, the Gmail seed landed in Updates) | MEASURED |
| **F4** | Scope is too large for one person: about 80% of the code serves features with no users | MEASURED / INFERRED |
| **F5** | Trust is weak for a $349/$499 purchase from a stranger: jargon in the report, no customers, no named founder story | INFERRED |
| **F6** | The payment path is unproven end to end (no webhook event since Jul 24) | MEASURED |
| **F7** | Measurement kept breaking (GA4 blind 3 months, Clarity never ran until Nov 8, inflated user counts) | MEASURED |
| **F8** | Strategy churn: the target customer changed about 6 times, 13 charters, 3 Pro price changes, attention split across products | MEASURED |

## 4. The context gate (answer all six before any change)

1. **Finding.** Which finding (F1-F8) does this change address? If none, it goes on the freeze list.
2. **Stage.** Which stage of the 6-week test does it serve? **Ask** (real conversations), **Answer** (a hire answered as a hire), **Collect** (a payment can be taken), or **Measure** (we can see what happened).
3. **Metric and baseline.** Which number in section 2 should move, how it is measured (for example `funnel_events_clean` with `not is_internal`, replies, calls, Stripe-verified payments), and its 8-month baseline.
4. **Precedent.** What happened the last time something like this was tried? Name the date or PR. If it failed, say what is different now.
5. **Stop criterion.** The date and result at which we stop or reverse it.
6. **Proof after shipping.** What live evidence will show it worked (observed, not inferred).

A PR, commit series, experiment or document that can't answer 1-3 doesn't ship. Answers go in the PR body under `## 8-month context` (template: `.github/pull_request_template.md`).

## 5. Freeze list (no work unless a paying customer asks)

QOC; Docs Studio, QuoteGen and the invoice manager; Teams, the public API, the client workspace and the decision-workspace tables; referrals and self-learning; Content Studio, Instagram Harvest and the Meta/X publishing paths; admin pages that read missing or empty tables; any new feature, new product surface or new pricing.

**Keep:** the engine, the demos, the Decision Review and Consultant Pilot pages, checkout, `/admin/growth`, `/admin/linkedin-growth`.

Prices are fixed: Free; Plus $17/mo or $168/yr; Pro $49/mo or $492/yr; Founder Decision Review $349; Consultant Founding Pilot $499. No new SKU.

## 6. The test and its stop rule (from the validation review)

**Week 0:** the free analysis answers a hire as a hire (reuse the hiring-demo engine, hide the jargon); one real end-to-end payment test; everything else frozen.

**Weeks 1-6:** founder-led and by hand. Honest notes and DMs, personal LinkedIn and personal email, logged in `/admin/linkedin-growth`, Mom Test calls.

| After 30 qualifying calls or 6 weeks | Decision |
|---|---|
| 3+ paid, or a written yes with price and date, and 8+ of 30 rate the pain 4-5 of 5 | Continue: grow this wedge |
| 1-2 paid, or 5+ real commitments in one segment | Narrow: one more 15-call round in that segment |
| 0 paid, under 5 commitments, or under 5 of 30 rating the pain 4-5 | Stop or pivot |
| Fewer than 8 calls by day 14 | The problem is outreach, not product: fix the asking first |

## 7. Applies to every AIWMC product

Store, Build, Neural OS, Education and anything new follow the same gate: name the finding, the stage, the metric with its baseline, the precedent, the stop criterion and the proof. Each product keeps its own context file with the same sections.

## 8. Keeping this file true

- Update section 2 when a baseline moves, with the date and source. Never rewrite history; append.
- A new finding gets the next ID (F9, ...). Retire a finding only with evidence.
- If this file and memory disagree, this file wins; fix the other one.
