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
| 7 | Loading screen said "12-variable Monte Carlo" | The simulation varies revenue and costs (`src/lib/profit-range.ts`) | "Simulating 1,000 months of revenue and costs" | DONE #316 |
| 8 | "Multi-model cross-checked" on every run | A second model runs only on rule-based red flags: 2 of 124 AI calls in 14 days | "Red-flag checked" | DONE #316 |
| 9 | Examples called "real analyses" | `exampleData.ts` is hand-written | "Illustrative example reports" | DONE #316 |
| 10 | Sample report page 9 said "12 variables" | Same as #7 | Removed | DONE #316 |
| 11 | Comparison said "$0 – $17/mo" while Pro is $49 | `TIERS.pro` | Range read from `TIERS` | DONE #316 |
| 12 | Advertised Monte Carlo never ran | No live caller before #313 | Seeded P10/P50/P90 profit range on every report | DONE #313 |
| 13 | Consultant price anchor read as a quote | Pricing page | Labelled illustrative | DONE #314 |
| 14 | Leaderboard claimed real analyses while showing samples | — | Copy follows the data source | DONE #308 |
| 15 | Security copy overstated | — | Honest copy | DONE #311 |
| 16 | No named person behind the $349 review | `/decision-review` has no name, photo or profile link | Add the founder's name, role and LinkedIn link | FOUNDER |
| 17 | $349 buyers can't see the deliverable | No sample Decision Memo exists | Fictional, labelled sample memo linked from the offer cards | DONE #318 |
| 18 | Example breadcrumbs used the apex host | JSON-LD on `/examples` | Canonical www | DONE #316 |
| 19 | Pro features advertised without end-to-end proof | 5-year model, pitch-deck package, API keys, 3 seats | Run each once on a test Pro account; remove any that fail | VERIFY |
| 20 | Unused `ClientTestimonials.tsx` holds testimonial copy | Not rendered anywhere | Delete it so it can't ship by accident | DONE #317 |

## C. Activation (visitor to first result)

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 21 | Anonymous runs were never saved | Migration never applied | Saved and claimable | DONE #302–#304 |
| 22 | Hero unreadable until the animation ran | — | Static first paint | DONE #301 |
| 23 | Mobile sticky CTA doubled the hero input | — | Fixed | DONE #311 |
| 24 | 191 sessions produced 1 idea submitted (0.5%) | `funnel_events_clean`, 30 days | Find where visitors stop (field, length rule, location) and remove that step | Partly done: input moved to the first screen on Oct 23; measure for 7 days |
| 25 | Visitors face a blank box | Only a placeholder; location is already optional | Three one-tap example decisions under the hero input | DONE #319 |
| 26 | 0 sign-ups after a result | `PostAnalysisAuthPrompt` already asks anonymous visitors to save the result; only 1 outside result in 30 days to judge it | Keep; judge once 20+ outside results exist | VERIFY |
| 27 | Business-email sign-up returned 500 (QA, Oct 9) | Session memory 2026-10-09 | Re-test; fix if still failing | VERIFY |
| 28 | Magic-link step never proven | Same QA | Re-test on a fresh address | VERIFY |

## D. Offer and pricing

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 29 | Annual prices show by default ($14, $41) next to monthly trial CTAs | `PricingSection` defaults to annual ($14 / $41 a month, billed $168 / $492) | Recommend monthly as default for a first purchase (lower commitment); founder decides | FOUNDER |
| 30 | Trial terms unclear (card required?) | Checkout collects a card; 14-day trial; cancels if no card at trial end (`create-checkout-session`) | FAQ matches: "We don't charge your card until day 15" | DONE |
| 31 | Free gives 5 complete runs a month, including Monte Carlo and pre-mortem | Pricing cards | Plus needs one clear reason to upgrade | FOUNDER |
| 32 | No way to ask before paying $349 | `/decision-review` has only "Reserve" | Add "Ask a question first" (mailto) next to Reserve | DONE #317 |
| 33 | Free run limit doesn't lead into $349 | Result page | After a high-stakes result, offer the review once | DONE #320 |
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
| 42 | QA runs leak into outside counts | Oct 21 and Oct 24 QA runs were untagged anonymous sessions | Every QA visit uses `?utm_medium=internal` (the session-level flag covers the rest of the session) | FOUNDER |
| 43 | `quantis_events` table is empty | No code reads or writes `quantis_events` (0 rows) | Unused; never report from it | DONE |
| 44 | `/decision-review` views only in GA4 | Memory 2026-10-15 | Emit a funnel event on view | DONE #317 |
| 45 | `subscription_started` never fires | `trackSubscriptionStarted` has no caller; 0 rows ever | Not needed: `paid_checkout_start` fires at the one shared checkout point (`useSubscription.ts`); paid conversions are read from Stripe webhooks and `subscriptions` | DONE |

## H. Reliability and operations

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 46 | Main analysis depends on one provider (DeepSeek) | DeepSeek primary; Lovable gateway if no DeepSeek key; deterministic fallback generator (`analyze-business/index.ts:1397`) | Force one fallback run in a test environment | VERIFY |
| 47 | Known invariant violations | All 8 are internal-account analyses from Aug 3 and Aug 24 (old engine), each flagged `report_integrity = BLOCK`; `/status` no longer shows degraded for them | No customer impact; new violations still mark the engine degraded | DONE #307 |
| 48 | Scheduled monitors | 6 ran green on 2026-10-24 | Keep watching nightly | DONE |
| 49 | No record of what changed each day | — | Nightly audit, 23:30 Denver | DONE |
| 50 | This register | — | Updated per PR; read by the nightly audit | DONE |

---

# Round 2: live audit 2026-10-25 (items 51–150)

Method: two internal-tagged runs on production, then a read of every public page, then a code check of each claim. The two runs were the hero example "Hire a 2nd technician at $5,500/mo" and "Mobile dog-grooming van service, 2 vans, $85 per groom" in Columbus, OH. Outside activity on Oct 25 (partial day): 10 sessions (Facebook 3, Google 1), 1 view of the $349 page, 0 ideas typed, 0 sign-ups, 0 payments.

## I. Core result quality (what a visitor gets back)

**Main finding:** the engine is sound on business-idea input. The grooming run reconciles: 2 vans × 6 grooms × $85 × 26 days = $26,520/month. It breaks on decision input and on missing location. That is the most likely reason a visitor who tries it does not come back.

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 51 | Our own hero example returned nonsense | "Hire a 2nd technician" → "B2B SaaS in Global", $1.15M/month revenue, $427k/month profit, "Investor Grade · Proceed with execution" | Hiring decisions go to the hiring model; examples are business plans with a city | DONE #322 |
| 52 | City typed into the report form became "GlobalColumbus, OH" | Box pre-filled with "Global"; saved to `analyses.location`; city calibration lost | Empty box, default applied at submit, prefix repaired | DONE #322 |
| 53 | The one-line hero sends no location | Every hero run is "Global" (US average) | Use a "City, ST" written in the idea | DONE #322 |
| 54 | Industry keyword match can misread decisions | "technician" lands in the software/SaaS bucket (substring match) | Whole-word keyword matching in both industry scorers (`containsWord`) | DONE #328 |
| 55 | Same benchmark row for unrelated industries | Pet services and the "SaaS" run both got gross margin 0.56, "exact match, sample_size 230" | No-keyword ideas marked `sector_fallback` (never "exact"); no overlay on the detected industry; city matching whole-word (Orlando/Las Vegas no longer LA) | DONE #328 |
| 56 | "Investor Grade · 90%" next to "Estimated · No direct benchmark" | Both 2026-10-25 runs | Score capped at 84 without a matched benchmark; live rerun shows 84%, no "Investor Grade" | DONE #328 |
| 57 | Integrity-check note shown on the result | Still on every live run after #328–#331. Stored reasons on three runs: `unanchored_dollar:$11,220`, `$5,940` (both gross profit, now anchored), `$18,000` (unknown derived figure) | Anchors added: visitor figures (#328), yearly (#329), gross profit and total costs (#330, #331); reason stored in `metadata.narrative_integrity`. Next: flag a dollar figure only when the sentence states it as revenue, profit, CAC, LTV, investment or payback and it contradicts that metric | PARTLY #331 |
| 58 | Weak top risk | "What kills this plan: LTV:CAC 18.4x is unusually high" for a grooming van; staffing and van downtime not mentioned | Panel lists real risks only, dangers first (#328). Still open: an industry-specific risk library | PARTLY #328 |
| 59 | Absurd ratios pass the sanity checks | "1% payroll ratio" on $1.15M/month revenue | Payroll under 3% of revenue above $20k/month flagged for review (not changed) | DONE #328 |
| 60 | Fixed "2.4s" run time in the result header | Real runs took ~30s | Show only real values | DONE #323 |
| 61 | "94% AI" shown when no cross-check ran | Default prop `consensusScore = 94` | Show "% model agreement" only when it exists | DONE #323 |
| 62 | "Why These Numbers?" showed Denver's rent ×1.15 "CoStar 2025" for every city | Hard-coded list | Matched metro multiplier or "US average"; only real values | DONE #323 |
| 63 | Invented fallbacks: $50 CAC, 40% margin, "SaaS benchmarks" 5% churn | Same list | Omitted when the report lacks them | DONE #323 |
| 64 | Break-even shown as "$37 455/mo" | Browser-locale formatting; a German browser shows "$37.455" | All 183 number formats en-US | DONE #324 |
| 65 | No "wrong industry? change it" control on the result | Summary says "evaluates B2B SaaS" with no way to correct it | Industry chip with a re-run | CODE |
| 66 | "Global" results give no prompt to add a city | — | "Add your city for local rent and wages" line on Global results | DONE #326 |
| 67 | Accuracy notice reads as "not ready" | "under active accuracy improvements … partially implemented" at the top of every result | Short, specific limits under the numbers instead | FOUNDER |
| 68 | Six result tabs before the decision is clear | Overview, Model, Scenarios, Risks, Evidence, Report | One-screen decision summary first, tabs after | CODE |

## J. Truth and credibility across the site

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 69 | Benchmark citations named vendors with invented sample sizes | "IBISWorld OD6113 · n=1,247" and "CoStar Group · n=3,200" were constants | "Quantis modeled benchmark · quarter" | DONE #323 |
| 70 | CoStar cited as a source | How It Works, geo table, result page; no licence | Removed | DONE #323 |
| 71 | "50+ cities" as a capability | The geo table has 15 metros plus a US average; 10 pages said 50+ | `GEO_COVERAGE_DISPLAY` | DONE #323 |
| 72 | How It Works said 16 metros | 15 in the table | From the constant | DONE #323 |
| 73 | "Computed from verified data", "real CAC", "live web data" on every run | How It Works vs Methodology ("rule-generated, not observed") | Modeled benchmarks; RVCE on Plus/Pro | DONE #323 |
| 74 | "Licensed … observations" | State of Quantis | Modeled cells | DONE #323 |
| 75 | "Used by … across 50+ cities" | Unused `Testimonials.tsx` | Deleted | DONE #323 |
| 76 | "Most Popular" on Plus with 0 customers | Pricing section, How It Works | Removed | DONE #324 |
| 77 | Content-generation prompt fed false facts | `marketingPosts.ts`: "100+ industries and 50+ cities" | Accurate facts plus "never claim customers or accuracy" | DONE #323 |
| 78 | Plus/Pro branding claim contradicted pricing | Use Cases said Plus removes the logo | Pro removes branding | DONE #323 |
| 79 | How It Works example output not labelled | "$4,200/mo profit, 7.1 months payback, 168% ROI" vs /examples Denver coffee "$4,200/mo, 109% ROI, 12 months" | Label it illustrative and use one consistent example | DONE #326 |
| 80 | Example reports show implausible returns | "679% ROI" consulting firm, "585% ROI" dropshipping on /examples | Recompute examples with the engine, or cap and explain | CODE |
| 81 | Example "8/10" scores have no stated scale | /examples cards | Say what the score measures, or remove it | CODE |
| 82 | Homepage sample page 9 shows a payback distribution the product does not produce | Hand-authored sample shows P10–P90 payback months; the engine produces a monthly profit range | Match the sample to the real output | CODE |
| 83 | State of Quantis "Last verified August 30" | Two months stale | Re-verify every line, then date it | CODE |
| 84 | Changelog ends August 27 | Nothing about Monte Carlo, anonymous saves, sample memo, truth passes | Add October entries | DONE #326 |
| 85 | Blog's last post July 2 | 19 posts; none since July | One post a week from real work (e.g. this audit) | FOUNDER |
| 86 | No person named anywhere | No About page, no founder name on $349 | About section with name, role, LinkedIn | FOUNDER |
| 87 | Social links spread across 10 networks | Footer: X, Telegram, Threads, Whop and more | Keep the 3 that are active | FOUNDER |
| 88 | "Listed on 21 directories" strip | 0 referrals from any directory in 30 days | Replace with something a buyer cares about (sample memo, demos) | FOUNDER |

## K. Offer, pricing and the paid path

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 89 | Consultants page never mentioned the $499 pilot | /consultants listed only Free/Plus/Pro | Pilot card from `ENGAGEMENT_OFFERS` | DONE #323 |
| 90 | Footer had no link to the paid review | Footer product links | Founder Decision Review and Sample Decision Memo links | DONE #323 |
| 91 | $499 pilot shares a page with the $349 review | /decision-review | A dedicated /consultant-pilot page | CODE |
| 92 | No intake preview for $349 | Buyer can't see what will be asked | "What we'll ask you" list on /decision-review | CODE |
| 93 | No way to book a call | Only mailto | Calendar link (Google Calendar is connected) | FOUNDER |
| 94 | Pricing page title says "$17/mo", page shows $14 | Annual default | Follows #29 | FOUNDER |
| 95 | Plus value reads as niche | Invoice & Capacity Check, Document Studio, TAM | Lead with "unlimited runs + saved scenarios + branded PDF" | FOUNDER |
| 96 | Pro lists five features with no end-to-end proof | 5-year model, pitch-deck package, roadmap, API, 3 seats | Test each (#19); remove any that fail | VERIFY |
| 97 | No first-customer offer | 0 customers, 0 case studies | Founding price, or a free review in exchange for a published case (honest, time-boxed) | FOUNDER |
| 98 | No promise on the $349 review beyond refund-before-intake | Scope text | State clearly what happens if the memo isn't useful | FOUNDER |
| 99 | Post-result upsell order | Plus wall and $349 card both appear on step 1 | Measure which gets clicks; keep one primary | VERIFY |
| 100 | Share links don't carry an offer | /r/ public reports | Check the shared view has a "test your own" CTA | VERIFY |

## L. Activation and page experience

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 101 | Homepage is long | Hero, film, hiring demo, 15-page sample, features, kit, pricing, FAQ | Cut to hero, sample memo, demos, pricing | CODE |
| 102 | Two idea forms on one page | Hero box plus the report form four sections down | One form | CODE |
| 103 | Product film loads on the homepage | `quantis-decision-film.mp4` metadata requests on load | Checked: the film loads metadata only; the intro opens only from a share link | DONE |
| 104 | Large first bundle | index JS 559 KB decoded; 57 requests on the homepage | Split the landing bundle | CODE |
| 105 | No hiring decision as a real run | The hiring model exists only as a fixed demo | Let a visitor run it on their numbers and save it | CODE |
| 106 | No second-location or price-change model | The engine models a new business | Add these decision types (they match the hero question) | CODE |
| 107 | Anonymous result → sign-up prompt untested at volume | 1 outside result in 30 days | Re-check after traffic returns | VERIFY |
| 108 | Starter kit and popups compete with the main action | Exit-intent and scroll popups | Keep one capture point | CODE |
| 109 | Hero label "What are you deciding?" vs an engine that models a business | #51 | Keep the label; routing plus examples now handle it | DONE #322 |
| 110 | No visible progress on mobile for the 30-second run | Narration only | Show the steps as a checklist | CODE |

## M. Traffic and distribution (round 2)

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 111 | Facebook is the best outside source | 23 of 226 outside sessions in 30 days; 3 of 10 today | Post there 3× a week with UTM links | FOUNDER |
| 112 | LinkedIn sends 15 sessions in 30 days | Referrers | Founder posts plus the sample memo link | FOUNDER |
| 113 | Google sends 8 sessions in 30 days | Referrers | 5 deep example pages (#5) and the blog (#85) | CODE |
| 114 | Competitor "vs" pages get 1 view in 30 days | `vs_page_view` | Link them from the blog and the pricing FAQ | CODE |
| 115 | No Search Console review | — | Check queries and impressions weekly | FOUNDER |
| 116 | Outreach stopped Oct 23 | Zoho pool used up | Refill (#1) | FOUNDER |
| 117 | Outreach replies not recorded | 0 recorded replies of 42 contacted | Log replies in Zoho | FOUNDER |
| 118 | 5 real sign-ups never contacted | #38 | Personal email | FOUNDER |
| 119 | No video content | Marketing department set up; blocked on the voice passport and Chrome | #6 | FOUNDER |
| 120 | No referral or share incentive | — | "Share your report" copy on results | CODE |

## N. Lifecycle

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 121 | Lifecycle emails run hourly but their content is unchecked | `check-lifecycle-emails-hourly` succeeded 2026-10-26 04:00 UTC | Read each template for false claims | VERIFY |
| 122 | Welcome email content unchecked | `send-welcome-email` | Same review | VERIFY |
| 123 | Trial-ending reminder unknown | No function named for it | Check Stripe settings, or add one | VERIFY |
| 124 | No win-back for 41 sign-ups | auth.users | One honest "here's what changed" email (needs approval) | FOUNDER |
| 125 | Newsletter promises "2 emails a month" | #40 | Send, or change the promise | FOUNDER |

## O. Instrumentation and operations

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 126 | Nightly audit stalled on a permission prompt | Run of 2026-10-25 23:36 stopped 14s in; no report written | Open the task, set its mode, Run now once | FOUNDER |
| 127 | `analysis_start` fires on fewer paths than `analysis_complete` | 30 days: 9 vs 49 sessions | Fire start on every run path | CODE |
| 128 | Trigger-emitted `analysis_complete` has its own session | Session id = analysis id | Join to the browser session | CODE |
| 129 | RVCE runs are not logged in `ai_calls` | No RVCE task rows in 60 days | Log them so "validated" claims can be checked | CODE |
| 130 | Hiring routing from the hero not yet measured | New in #322 | Watch `hero_hiring_routed` | VERIFY |
| 131 | Supabase CLI outdated | v2.118.0 vs v2.122.0 | Update | FOUNDER |
| 132 | Error tracking unreviewed | Sentry DSN is env-driven | Check the last 7 days of errors | VERIFY |
| 133 | No load test | — | One 20-concurrent-run test before any campaign | CODE |
| 134 | Dead third-party pixel | `createcdn.com/la.js` returns 404 on every page | Removed | DONE #324 |
| 135 | Content Security Policy still allows unused hosts | `vercel.json` | Prune after #324 | CODE |

## P. Legal and compliance

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 136 | No cookie banner | EU visitors; GA4 loads | Consent for analytics where required | FOUNDER |
| 137 | Privacy policy may list removed trackers | la.js, Clarity | Re-read the policy | VERIFY |
| 138 | "No questions asked" refund plus 14-day trial | Pricing | Confirm the cost is acceptable | FOUNDER |
| 139 | Trademark ™ used throughout | "AIWMC™" | Confirm filing status | FOUNDER |
| 140 | Outreach compliance | CAN-SPAM footer, unsubscribe | Check the sender template | VERIFY |

## Q. Product depth buyers expect

| # | Blocker | Evidence | Fix | Status |
|---|---|---|---|---|
| 141 | Consultants want an assumptions table they can hand over | The sample memo has one; the export doesn't | Assumptions table in the PDF | CODE |
| 142 | Saved scenarios not shown to anonymous users | Sign-up wall | Show one saved scenario after sign-up | CODE |
| 143 | No import of actual numbers | Typed inputs only | CSV upload of the last 12 months | CODE |
| 144 | No comparison of two options | One plan per run | "A vs B" view (hire vs not, location A vs B) | CODE |
| 145 | No downside-first summary | Verdict leads with "Viable" | Lead with "what has to be true" | CODE |
| 146 | No industry pack for the first market | Generic | Pick one (HVAC, salons, clinics) and tune risks and defaults | FOUNDER |
| 147 | No accountant/CFO partner channel | — | Offer the $499 pilot to 10 named fractional CFOs | FOUNDER |
| 148 | No "what changed since last run" for returning users | — | Diff between runs | CODE |
| 149 | No public roadmap | — | A short roadmap from this register | FOUNDER |
| 150 | This register, round 2 | — | Read by the nightly audit | DONE |
| 151 | Implausible LTV:CAC shown as "healthy" | Live 2026-10-26 grooming run: "LTV:CAC 79.3x indicates healthy unit economics" | Above 20x the summary and narrator say "implausibly high, check CAC" instead of "healthy" (`ltv-cac-language.ts`); the calculator flag and validator rule already existed | DONE (PR) |
