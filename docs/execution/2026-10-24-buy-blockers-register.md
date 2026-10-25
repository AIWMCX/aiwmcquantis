# Buy-blockers register — why people don't buy Quantis, and the fix for each

Started 2026-10-24 (Denver). This register is updated in place. The nightly audit reads it and reports what changed.

Statuses:
- **DONE** — merged and verified live.
- **PR** — open, CI running.
- **CODE** — fixable in code, not started.
- **VERIFY** — claim or flow not yet proven either way.
- **FOUNDER** — needs a founder decision or action. Pricing, sending, customer data and identity are the founder's call.

## Baseline (2026-10-24, outside visitors only, internal excluded)

- 191 homepage sessions in 30 days; 2 analysis starts; 1 real analysis (Oct 9); 0 sign-ups since Sep 9; 0 payments ever.
- Outside sessions per day: Oct 18–20: 12 / 11 / 17. Oct 21–23: 7 / 6 / 3. Oct 24: 0.
- Referrers (30 days): direct/unknown 189, Facebook 23, LinkedIn 15, Google 8, Instagram 5.

**Main finding:** traffic is the largest blocker. At about 6 visitors a day, even a perfect page converts nobody. Section A matters most; B–H make sure the few who arrive can believe the page and pay.

## A. Traffic and distribution

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 1 | Outreach stopped | Zoho prospect pool used up Oct 23; sessions fell from 17 to 0 a day | Refill prospects (Apollo is connected), approve and send the 9 queued follow-ups | FOUNDER |
| 2 | Posting cadence unknown | No LinkedIn/IG referrals since Oct 20 | Check the autoposter queue; one post a day linking to `/demo/hiring-decision` | FOUNDER |
| 3 | 189 of 226 sessions unattributed | `funnel_events_clean` referrer empty | First-touch attribution merged in #272; tag every link we post with `utm_source` | FOUNDER |
| 4 | 21 directory listings send ~0 visits | No directory domain in 30-day referrers | Stop new listings; reuse the time for outreach | FOUNDER |
| 5 | Search sends 8 visits a month | Google referrals in `funnel_events_clean` | Deep-dive content on the 5 highest-intent example pages | CODE |
| 6 | Short-form video not started | Marketing department installed 2026-10-24 | Connect Claude in Chrome, record the voice passport, then the weekly content run | FOUNDER |

## B. Truth and trust

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 7 | Loading screen said "12-variable Monte Carlo" | The simulation varies revenue and costs (`src/lib/profit-range.ts`) | "Simulating 1,000 months of revenue and costs" | PR #316 |
| 8 | "Multi-model cross-checked" on every run | A second model runs only on rule-based red flags: 2 of 124 AI calls in 14 days | "Red-flag checked" | PR #316 |
| 9 | Examples called "real analyses" | `exampleData.ts` is hand-written | "Illustrative example reports" | PR #316 |
| 10 | Sample report page 9 said "12 variables" | Same as #7 | Removed | PR #316 |
| 11 | Comparison said "$0 – $17/mo" while Pro is $49 | `TIERS.pro` | Range read from `TIERS` | PR #316 |
| 12 | Advertised Monte Carlo never ran | No live caller before #313 | Seeded P10/P50/P90 profit range on every report | DONE #313 |
| 13 | Consultant price anchor read as a quote | Pricing page | Labelled illustrative | DONE #314 |
| 14 | Leaderboard claimed real analyses while showing samples | — | Copy follows the data source | DONE #308 |
| 15 | Security copy overstated | — | Honest copy | DONE #311 |
| 16 | No named person behind the $349 review | `/decision-review` has no name, photo or profile link | Add the founder's name, role and LinkedIn link | FOUNDER |
| 17 | $349 buyers can't see the deliverable | No sample Decision Memo exists | Fictional, labelled sample memo linked from the offer cards | PR #318 |
| 18 | Example breadcrumbs used the apex host | JSON-LD on `/examples` | Canonical www | PR #316 |
| 19 | Pro features advertised without end-to-end proof | 5-year model, pitch-deck package, API keys, 3 seats | Run each once on a test Pro account; remove any that fail | VERIFY |
| 20 | Unused `ClientTestimonials.tsx` holds testimonial copy | Not rendered anywhere | Delete it so it can't ship by accident | PR #317 |

## C. Activation (visitor to first result)

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 21 | Anonymous runs were never saved | Migration never applied | Saved and claimable | DONE #302–#304 |
| 22 | Hero unreadable until the animation ran | — | Static first paint | DONE #301 |
| 23 | Mobile sticky CTA doubled the hero input | — | Fixed | DONE #311 |
| 24 | 191 sessions produced 1 idea submitted (0.5%) | `funnel_events_clean`, 30 days | Find where visitors stop (field, length rule, location) and remove that step | CODE |
| 25 | Hero form demands 10+ characters and a location | Form hint "10 more chars" | Show example ideas to click; make location optional if the engine allows | CODE |
| 26 | 0 sign-ups after a result | No `free_signup_*` after `result_viewed` in 30 days | One "save this report" prompt with the reason (keep it, rerun it) | CODE |
| 27 | Business-email sign-up returned 500 (QA, Oct 9) | Session memory 2026-10-09 | Re-test; fix if still failing | VERIFY |
| 28 | Magic-link step never proven | Same QA | Re-test on a fresh address | VERIFY |

## D. Offer and pricing

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 29 | Annual prices show by default ($14, $41) next to monthly trial CTAs | Live pricing section | Confirm the default toggle and that the CTA matches the shown price | VERIFY |
| 30 | Trial terms unclear (card required?) | FAQ "Is the 14-day trial really free?" | Answer matches Stripe settings | VERIFY |
| 31 | Free gives 5 complete runs a month, including Monte Carlo and pre-mortem | Pricing cards | Plus needs one clear reason to upgrade | FOUNDER |
| 32 | No way to ask before paying $349 | `/decision-review` has only "Reserve" | Add "Ask a question first" (mailto) next to Reserve | PR #317 |
| 33 | Free run limit doesn't lead into $349 | Result page | After a high-stakes result, offer the review once | CODE |
| 34 | "48-hour target" without a stated capacity | `/decision-review` | State how many reviews a week the founder can take | FOUNDER |

## E. Checkout and payments

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 35 | A live payment has never been proven end to end | Last Stripe webhook event 2026-07-24 | $349 with a 100% promo code, then check the webhook, alert and engagement rows | FOUNDER |
| 36 | Test checkouts counted as outside traffic | 4 `paid_checkout_start` events on Oct 12–13 in two paired sessions | Tag QA checkouts (`utm_medium=internal`) | FOUNDER |
| 37 | Plus/Pro checkout not re-tested since price changes | — | One test checkout per plan in Stripe test mode | VERIFY |

## F. Retention and lifecycle

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 38 | Five real sign-ups never contacted | Carried over from 2026-10-15 | One personal email each | FOUNDER |
| 39 | 4 of 8 leads stuck at "pending confirmation" | `leads.status` | Check the confirmation email arrives; resend once | VERIFY |
| 40 | Newsletter promises 2 emails a month | Footer copy | Confirm one has been sent, or change the promise | FOUNDER |

## G. Instrumentation

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 41 | Founder alias counted as an outside user | 67 analyses from `beltovbogdan@` | Pattern extended | DONE #315 |
| 42 | QA runs leak into outside counts | Oct 21 "Fictional QA case"; Oct 24 00:57 UTC trigger-emitted anonymous run | Mark trigger-emitted events internal when the analysis owner is internal | CODE |
| 43 | `quantis_events` table is empty | 0 rows ever | Wire it or drop it; don't report from it | CODE |
| 44 | `/decision-review` views only in GA4 | Memory 2026-10-15 | Emit a funnel event on view | PR #317 |
| 45 | `subscription_started` never fires | Muse audit 2026-09-20 | Check; wire in the webhook | VERIFY |

## H. Reliability and operations

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 46 | Main analysis depends on one provider (DeepSeek) | 124 of 128 AI calls in 14 days | Confirm the fallback path works | VERIFY |
| 47 | Known invariant violations | Flagged, not degrading status (#307) | List them; fix the top one | CODE |
| 48 | Scheduled monitors | 6 ran green on 2026-10-24 | Keep watching nightly | DONE |
| 49 | No record of what changed each day | — | Nightly audit, 23:30 Denver | DONE |
| 50 | This register | — | Updated per PR; read by the nightly audit | DONE |
