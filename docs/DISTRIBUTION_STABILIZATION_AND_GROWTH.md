# Distribution Stabilization & Growth — AIWMC Quantis

**Written:** 2026-07-02, after a session that took Quantis from a 19-run red
CI streak to fully green, deployed, and live-verified — including a
permanent SEO-monitoring layer decoupled from the deploy pipeline (see
`docs/QOC_MIGRATION_PLAN.md`'s sibling work and the memory entry
`quantis_session_2026-07-02_production_freeze`).

**Ground truth as of writing (verify fresh before trusting — see "How to
re-verify" at the bottom):**

| Metric | Value |
|---|---|
| Analyses, ever | 53 |
| Analyses, last 7 days | 8 |
| Confirmed paid subscriptions | 0 |
| Accounts in active Plus trial | 22 (`status='trialing'`, `plan_id='plus'`) |
| MRR | $0 |
| Directory listings live | 11 of 46 tracked |
| Directory listings not started, HIGH priority | includes Crunchbase (DR91), Capterra (DR90), G2 (DR83), GetApp (DR83), Wellfound (DR88), F6S (DR82), BetaList (DR73), TAAFT (DR77) |

This document does not repeat the multiplicative-zero framing from earlier
tonight (traffic × conversion × retention — any zero term zeroes the
product) except to restate its one operational consequence: **every
recommendation below is sequenced by its effect on the traffic term first**,
because that term is still, by a wide margin, the smallest number in the
equation. 8 analyses/week is not a conversion-rate problem to solve — it's
too small a sample to even measure a conversion rate.

---

## Part 1 — Stabilization (make what's live provably durable)

This is done, not aspirational. Recorded here as the floor everything else
stands on.

1. **SEO permanence** — `scripts/verify-live-production.sh` +
   `.github/workflows/seo-live-monitor.yml`. Runs every 6 hours against the
   live domain, independent of CI/CD. Catches: duplicate page bodies, broken
   canonicals, stale content regressions, soft-404s, unreachable
   sitemap/robots. Verified green on the real Ubuntu Actions runner as of
   this writing (run `28621651724`).
2. **Deploy fidelity** — `scripts/verify-deploy.sh` asserts every edge
   function's live `commit_sha` matches what was just pushed. A function
   silently absent from `production-deploy.yml`'s deploy list (as
   `run-tier-qa-harness` and `run-accuracy-harness` were, found and fixed
   this session) can't recur unnoticed — health-check now happens per
   function, not just per build.
3. **The financial firewall** — every number in a report traces to the
   deterministic engine; narration can't inject a number that doesn't match
   a computed metric within tolerance (`validateAIOutput`,
   `ai-safety-guardrails.ts`). This is the trust foundation the growth work
   below depends on — none of it matters if the product lies about numbers.
4. **QOC Stage 1 (shadow mode)** — live, accumulating real audit data
   without touching the user-facing response. See
   `docs/QOC_MIGRATION_PLAN.md`.

**What's still open, lower priority than growth work:** F6 (regenerate
`baseline/` git-diff snapshot — superseded in practice by the stronger live
monitor, but still worth closing eventually), the GH-Actions-vs-residential
content-fetch discrepancy (`task_3b907083`, background investigation, does
not block anything).

---

## Part 2 — Distribution (the actual next moves, ranked)

Ranked by **cost to execute ÷ effect on the traffic term**, not by how
technically interesting the work is. This deliberately excludes anything
that requires traffic to already exist to be worth building (predictive
accuracy modeling, ML/QOC fusion — see last session's conversation for why).

### Rank 1 — Close the directory backlog (bounded, no new decisions needed)

`src/data/directorySubmissions.ts` already has 46 directories ranked by DR
score and priority. 35 are `not_started`. This isn't a strategy question,
it's an execution backlog. The 8 highest-leverage unclaimed listings:

| Directory | DR | Monthly visits | Cost |
|---|---|---|---|
| Crunchbase | 91 | — | Free |
| Capterra | 90 | — | Freemium ($2/click) |
| Wellfound (AngelList) | 88 | — | Free |
| G2 | 83 | — | Freemium |
| GetApp | 83 | — | Freemium |
| F6S | 82 | — | Free |
| TAAFT | 77 | 4.8M | $49 |
| BetaList | 73 | — | Freemium ($129 to skip queue) |

**Why this ranks first:** it's a fixed amount of work (fill out ~8 forms),
it's permanent (backlinks and listings don't expire), it doesn't compete
with product engineering time in any meaningful way, and — critically for a
$0-MRR pre-revenue product — most of it is free. This was already offered
and drafted earlier tonight; the blocker is execution, not planning.

### Rank 2 — Manual, targeted distribution to the actual ICP

Quantis's own use-case copy already names the audience: founders,
investors, consultants. The autoposter-style "daily multi-post" approach
was diagnosed earlier as mathematically incapable of producing signal at
~64 followers (organic reach ≈ 5-10% of followers ≈ 5 impressions/post).
The fix isn't more automated posting, it's:

- **LinkedIn, manual, daily.** 15 thoughtful comments/day on posts from
  consultants and startup-adjacent accounts, 50 connection requests/week.
  This is not content production — it's showing up in front of people who
  are already looking for exactly this. Bounded time cost (~20-30 min/day),
  compounds because LinkedIn's algorithm rewards consistent genuine
  engagement more than it rewards post volume.
- **One high-effort post on Reddit/IndieHackers**, framed as "I built a
  tool that runs a financial pre-mortem — here's a real report," with an
  actual generated report as the artifact. The report is the ad; it needs
  zero persuasive copy because the tool's own output is the proof.
- **JUNO LEADS activation**, if the sending-domain + ZeroBounce blocker from
  earlier is resolved — sequences are reportedly already written, this is
  an unblock, not new work.

### Rank 3 — Convert the 22 trials before chasing new signups

This is the highest-leverage number in the whole dataset and it's the one
least discussed tonight: **22 people are currently inside a 14-day Plus
trial.** Converting even a handful of those to paid is faster and cheaper
than acquiring 22 new trial signups from scratch, and it's the first real
signal on whether the product/pricing/onboarding actually converts once
someone's in the door.

Concrete moves, all bounded and low-effort:
- Check whether there's an automated "trial ending soon" touchpoint email
  (`send-lifecycle-email` exists in the function list — verify it's wired
  to trial-expiry, not just welcome/onboarding).
- Personally reach out to active trial users if the volume is small enough
  to do by hand (it is — 22 is a number one person can act on individually
  today, not a segment that needs automation to be worth touching).
- The progress-bar UX fix shipped this session (removing the alarming
  "taking longer than usual" warning on normal-length requests) directly
  serves this: a trial user's first impression during their 14-day window
  matters disproportionately, and that fix removes a real, screenshotted
  point of friction from exactly that experience.

### Rank 4 — The consultant-repositioning idea (real, but sequence-gated)

Repositioning Quantis's UI/pricing framing from "founders" toward
"consultants who can resell this to multiple clients" is a real, sound
idea — a consultant's willingness to pay for a tool that makes them look
good in front of *their* clients is a stronger unit economics story than a
single founder's one-time use. But this needs product changes (white-label
PDF export with the consultant's own branding is the single feature that
actually unlocks this — already scoped conceptually in an earlier
conversation) and shouldn't be pursued as a "week of ML architecture" — it's
a bounded, shippable feature, sized like the fixes in this session, not
like a platform rebuild.

**Sequencing note:** don't build this before Rank 1-3 produce a traffic
increase you can measure the effect against. Shipping a consultant-focused
feature to an audience of 8 analyses/week tells you nothing about whether
it works.

---

## What this document deliberately does not include

- **A content calendar or social media posting schedule.** Volume-based
  content strategy was diagnosed and rejected earlier tonight — it doesn't
  work at current follower counts, and building a calendar for it would be
  producing a plan instead of producing traffic.
- **Paid acquisition guidance.** The $70 January campaign was, by its own
  math, too small to be a statistically meaningful test (≈200-400 clicks
  into a ~0.2% visitor-to-paid funnel). Any future paid spend needs to be
  sized to actually produce a measurable signal (likely $500+ as a real
  test, not $70), and that's a budget decision for the founder, not
  something to default into a strategy doc.
- **New social account creation** (Foundation, Store, separate LLC
  accounts). Diagnosed earlier as actively counterproductive at current
  scale — it divides limited posting energy across more channels that each
  start at zero, rather than concentrating it.
- **Multi-CRM buildout.** One CRM already exists and is already
  underutilized (near-zero real leads in it). Adding more CRMs to manage
  an empty pipeline is administrative overhead with no growth effect.

If any of these become worth revisiting, they should be triggered by a
specific number crossing a specific threshold (e.g., "revisit paid
acquisition once organic traffic proves the funnel converts at all"), not
scheduled by calendar.

---

## How to re-verify the numbers in this document

Don't trust this document's numbers past their write date without checking.
This is the same discipline the SEO-permanence section of this session was
built around — a status claim is only as good as when it was last verified.

```sql
-- analyses volume
select count(*) as total, count(*) filter (where created_at > now() - interval '7 days') as last_7d
from public.analyses;

-- trial/paid state
select status, plan_id, count(*) as n
from public.subscriptions
where status in ('active', 'trialing')
group by status, plan_id;
```

```bash
# directory backlog state
grep -c 'status: "not_started"' src/data/directorySubmissions.ts
grep -c 'status: "live"' src/data/directorySubmissions.ts
```
