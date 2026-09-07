# AIWMC Quantis marketing operations — 2026-09-07
Version 1.0. Owner: founder + engineering/content operations. This is a specification and evidence attachment to the canonical register, not a second tracker. Implementation status is explicit below.

## Evidence and corrections
Read the canonical register before any recurring work. PR #109 already records durable credential leases and atomic publisher claims: preserve closure. Do not reopen the old advisory-lock issue from a stale handoff.
Live Supabase baseline: 42 draft posts; 13 Studio generations; 0 credentials; 0 platform variants before this session. Six logs are action=generate/status=error, not failed publishing attempts.
After this session: same 42 posts, three revised with original hook/brief/date/status retained in notes, three LinkedIn draft variants, no scheduled_at or publication IDs. Refresh batch: 2026-09-07-premortem-v1. Dates Sep 8–10 are editorial proposals, not publication appointments.

Repository source:
- Studio generates and copies text, shows last 20 generations, provides no native queue handoff.
- Seed/refresh upserts status=draft and content over existing work. Branch change ignores conflicts and reports actual inserted rows.
- Scheduling assumes UTC-7 year-round and ignores returned Supabase errors. Still open: America/Denver DST handling and an atomic scheduling transaction.
- The generation prompt previously invited unsupported directional/cohort claims. Branch removes that instruction, requires labeled illustrative examples, awaits telemetry, and reports persistence errors.
- Provider resolver chooses one configured provider. A runtime fallback chain is not implemented despite the header description.
- Account URLs conflict between Connect.tsx and LocalBusinessSchema.tsx. Never resolve ownership by guessing.

## Public social audit
Observed via public [LinkedIn company page](https://www.linkedin.com/company/aiwmc/) on 2026-09-07: AIWMC mixes Quantis, Build and Research posts. Visible Quantis topics include dimensional consistency, contract economics, discount contribution and customer concentration. Mark these observed published concepts; do not infer an internal receipt or exact publication timestamp from relative dates. Public snapshot shows 3 followers, which is not reach or a full analytics export.
The bio still includes a 90-second claim, conflicting benchmark counts, and broad advisory comparisons. Revise through the account owner after substantiation review.
Connect.tsx links X aiwmcx1, Instagram wmc.ai, Telegram AYO_IS_AIWMC and a Facebook share URL. Public retrieval failed for those four channels. Their post histories and analytics remain UNKNOWN. LinkedIn feed coverage is partial, so absence does not establish a topic is unused.
No authenticated impressions/clicks/saves/conversion analytics were obtained.

## One operating framework
Preserve the existing calendar, queue, editor and KPI screen. Use one marketing workspace with views: Overview, Ideas, Studio, Calendar, Accounts, Results.
Every item requires product_id (quantis/build/research), campaign_id, idea_id, revision_id, source generation, channel, audience, objective, evidence refs, claim review, owner and timestamps. Shared corporate accounts need an explicit product tag; do not combine product conversion totals.
Content lineage: observed evidence → idea → versioned brief → organic/ad creative variant → editable asset → approval of exact revision/hash → calendar job → attempt → external receipt → metric snapshot → attributed opt-in/CRM event.
A text image_prompt is not an image asset. Persist render job, provider/version, storage object, dimensions, alt text, cost estimate and review outcome. Render exact financial text/charts deterministically; generative art may supply decorative backgrounds.
Ad creative is a content mode, not permission to launch an ad. Native mode should produce three different concepts with hook, primary text, headline, CTA, visual brief and evidence requirements. No budget, targeting or campaign mutation without separate authorization.

### Scheduling and publication
Use atomic database operations for Studio handoff and scheduling, with generation/revision idempotency keys and real authorization. Editing approved copy invalidates approval. Never reset published, scheduled or manually edited work through seeding.
Scheduling stores UTC instant plus America/Denver timezone; tests include DST, invalid/ambiguous times, canceled posts and partial platform failures.
A timed-out external request has outcome=unknown until reconciled. Do not blindly retry an uncertain publication; require lookup/manual reconciliation where provider cannot deduplicate. No claim of exactly-once external delivery.
OAuth must bind the actual author/account. Connect lists a company page; existing w_member_social authorization cannot be assumed to authorize company-page publishing. Inspect organization scopes and author URN before selecting the company page.
Freshly generated content remains draft. Existing founder approval requirement remains in force.

### Cadence
Daily: reconcile public/manual posts and internal receipts; inspect failed/unknown attempts and credential health; review next seven days; flag duplicates, stale claims and missing evidence; report actual funnel activity.
Every three days: reconcile draft/used/unknown inventory; revise at most three high-priority stale items using current month, audience needs and observed evidence. Preserve previous revisions. If there is no evidence of a performance problem, do not rewrite solely to increase generation volume.
Monthly: choose one audience, business problem, free deliverable and primary conversion event. September hypothesis: founders and fractional CFOs preparing Q4 commitments need to identify untested revenue/capacity/cash assumptions. This is a hypothesis, not customer research proof.
Scheduled ChatGPT tasks now exist for daily review and three-day refresh. They do not implement the application worker. Existing paused revenue/Slack audits were left paused; existing CRM reconciliation was not duplicated.

### Metrics
Display observed numerator, denominator, date window, exclusions, source and freshness. Unknown is not zero.
Daily: successful public receipts, landing visits, free-demo starts/completions, completed next-test plans, errors and qualified inquiries.
Monthly: activated external users, returning users, qualified conversations, verified cash collected, refunds, fulfillment cost, and subscription MRR separately.
Activation proposal: user completes a decision, identifies one uncertain assumption and saves/exports a next test. An AI call, post draft or signup is not activation.
Measure demo completion/completed starts; inquiry/qualified completed demos; paid conversion/eligible qualified opportunities. Deduplicate visitors and internal/seed/test accounts. Small samples are descriptive, not proof of a winning variant.
UTM product/campaign/content IDs link to first-party events. CRM receives opt-in contact and campaign context through an authenticated idempotent outbox; no raw financial assumptions in CRM or ad-platform events. Preserve existing Zoho suppression/dedup/send-history controls. No inferred email opens or leads created merely because someone views a demo.

## Complimentary Decision Pre-mortem
Status: first self-assessment coded at public/decision-premortem.html on this PR, NOT LIVE. The existing PreMortem.tsx is Plus-only and redirects ineligible users to pricing. The complimentary static worksheet gives five evidence checks, a user-defined consequence/next test and text/print export without signup, payment, AI calls or persistent storage. It explicitly does not calculate forecasts or transfer inputs into the app. Five DOM regression tests added; real-browser test is blocked because Chromium is absent and the approved download timed out. The deeper engine-backed specification below remains unimplemented; extend existing engine/UI for that increment.

Promise: “Find the assumption to test before committing money.”
No card, no forced meeting, no email wall before the useful result. Optional save/account request follows the result, with clear privacy and retention behavior.
1. Choose a decision: launch, hire, change price, sign a lease or expand capacity.
2. Capture currency, time period, revenue drivers, delivery constraints, fixed/variable cost assumptions, initial commitment and cash collection timing. Each field supports “unknown”; never silently substitute zero.
3. Display an assumption register: supplied value, unit, evidence/source/date and confirmed/estimated/unknown status.
4. Run baseline plus a user-selected downside using the existing deterministic engine. Narration must reference calculated output; no invented probabilities or arbitrary readiness scores.
5. Return a one-page brief: decision, fragile assumption, baseline/downside difference, break-even versus payback distinction, missing evidence and one specific next test with owner/date.
6. Save/export the result without paying. Show optional paid assistance only after delivering that result.

First narrow example: fixed-fee consulting work. Illustrative only: fee $10,000; 80 delivery hours at $75 variable cost/hour gives $4,000 contribution before fixed overhead. At 120 hours, contribution is $1,000. This is not net profit, cash collected or a customer case. Validate with canonical arithmetic tests before product use. Cash terms are a separate input; do not infer cash from invoicing.
Use a clearly marked sample for people who have no inputs. Switching to personal inputs must remove sample values or require explicit acceptance. Demo results must not enter revenue or customer-traction reporting.

Paid boundary: optional Founder Review/Consultant Pilot can add evidence reconciliation, expanded scenarios, memo review, agreed revisions and delivery. Verify actual $349/$499 offer scope and access before displaying exact claims. Do not imply financial advice, guaranteed returns or automated expert sign-off.
Acceptance: anonymous completion, mobile/keyboard access, unknown-input handling, source labels, deterministic parity, AI-unavailable useful output, no paywall before result, export recovery, opt-in attribution, internal exclusion and same-case continuity into a paid engagement.

## Open-source adoption
These are discovery observations, not security approvals or viral-performance guarantees. Displayed stars on 2026-09-07:
| Repository | Stars | Use | Implementation |
|---|---:|---|---|
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | 47.5k | Social content, free-tool strategy, CRO and analytics review | Shortlisted, not installed |
| [AgriciDaniel/claude-ads](https://github.com/AgriciDaniel/claude-ads) | 8.9k | Creative briefs and paid-media governance; broader than Quantis needs | Reference reviewed, no adapters installed |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 53.6k | Discover original tools | Index only |

Before adoption pin an exact upstream commit, read selected files and license, inspect scripts/network/credential behavior, record license attribution and add a bounded regression check. No curl-pipe installers or entire repository import. Runtime must use audited versioned prompt assets, not download instructions from GitHub on each generation. No social account or CRM credentials to third-party agent packages.
Do not claim “wired” until a saved brief is generated through an adopted, versioned asset and flows into the existing queue with lineage preserved.

## Delivery gates and immediate work
1. Merge-safe PR and CI for non-destructive seeding and truthful generation.
2. Resolve actual account/author and complete OAuth; founder-only authentication step.
3. Atomic Studio→queue revision handoff, claim checking, DST-safe approval/scheduling and uncertain-publication recovery.
4. Owner-approved post and external receipt reconciliation.
5. Existing free PreMortem flow extended with the above complete no-payment deliverable.
6. Audited selected open-source prompt assets, creative asset rendering and CRM attribution outbox.
7. End-to-end customer/demo and organic conversion evidence before any paid campaign experiment.
No broad redesign, new BI platform or new agent runtime is required to prove this first path.

## GTM truth
GTM activity exists: public posts and offers. Repeatable acquisition, activation and paid delivery remain unproven.
The historical register contradicts itself by classifying one account as founder-alt and later “likely” external payer. Until reconciled against identity and successful Stripe receipts, the external paid-customer count is UNKNOWN. Do not report one payer, zero current payers, or MRR from those conflicting records.
The next commercial test is whether a relevant visitor completes a useful free decision brief and requests deeper help. Publishing volume alone cannot answer that.
