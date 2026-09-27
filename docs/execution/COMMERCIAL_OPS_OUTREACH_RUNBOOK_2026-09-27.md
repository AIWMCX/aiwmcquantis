# Commercial Ops — first outbound batch runbook (2026-09-27)

Where: `/admin/commercial` (admin + `VITE_FLAG_COMMERCIAL_WORKFLOW`).

## Pipeline

```
Campaign (sender identity) → Batch → Import leads with signals
  → suppression gate (code) → evidence gate (code: ≥1 signal)
  → first-touch agent (grounded on Commercial Foundation, current version)
  → claim guard (code) → DRAFT → you Approve → READY TO SEND
  → you send from your own mailbox → "I sent it" (prospect → contacted)
  → reply recorded (positive/neutral/objection → replied; negative → lost;
    unsubscribe/bounce → suppressed + lost)
  → no reply: step 2 on day 3, step 3 on day 7, step 4 on day 14
```

Patterns taken from open-source sales agents, rebuilt on the existing
runtime (no second framework):

- **avcap/ai-sdr**: Prospector → Enrichment → Copywriter → Orchestrator, with
  multi-step sequences. Here: import (Prospector), signals (Enrichment),
  `first_touch` stage (Copywriter), sequence steps 2–4 (Orchestrator).
- **SalesGPT**: stage-aware conversation (Introduction → Qualification → Value
  → Needs → Solution → Objection → Close). Here it is compressed into the
  first-touch structure (signal opener → one problem → one mechanism sentence
  → yes/no CTA), with the existing objection and call-brief stages covering the
  later phases.

## Enforced in code (not only in the prompt)

| Rule | Where |
|---|---|
| Unsubscribed / bounced / DNC / duplicate / contacted in last 30 days / open opportunity never drafted | `commercial-suppression.ts` via `suppressionGate()` |
| No signal recorded → no LLM call | `draftFirstTouchFor()` |
| Every signal the model says it used must be one you recorded | `reconcileFirstTouch()` |
| Prohibited claims, "-grade" claims, guarantees, fake urgency, invented customers/adoption, prices not in the foundation, word ceiling | `claim-guard.ts` |
| No links in a first touch | `reconcileFirstTouch()` |
| Greeting, signature and opt-out line appended by code | `composeOutboundEmail()` |
| Only an approved message can be marked sent; approval re-checks suppression | `mark_commercial_followup_sent()`, `approve_followup` |
| Every generation audited with the foundation version | `commercial_agent_runs` (`first_touch` stage added) |

## Lead import format

Header row required. Tab-separated rows pasted from a sheet also work.

```
company_name,contact_name,contact_role,email,website,segment,signals
Northline Advisory,Jane Doe,Fractional CFO,jane@northline.co,northline.co,fractional CFO,"Fractional CFO for 6 dental groups | Posted about rebuilding client models each quarter"
```

Signals are the only facts the email may reference: something they posted, the
niche they serve, hiring, a recent change. Leads without signals import, but
they are not drafted until you add one.

## Before the first send

1. Create the campaign with a sender identity that includes your name, your role
   and a postal business address (US CAN-SPAM requires a physical address in
   commercial email).
2. Import 10–20 leads for batch 1. Keep volume low while the sending domain
   warms up.
3. Click **Draft first touches** and read every draft. Reject anything you
   would not say in person.
4. Send from your own mailbox, then click **I sent it** on each one.
5. Record every reply the same day.

## Smoke test after deploy (5 minutes)

1. Open **Foundation**. It should show v2. If it errors, the foundation
   contract fix has not deployed yet.
2. Create a test campaign and import one row for a company you own, with one
   signal. Click **Draft first touches**. The result should be `Drafted 1`,
   and a row with stage `first_touch` should appear in `commercial_agent_runs`.
3. Import the same row again. It should be skipped as `already_exists`.
4. Approve the draft, click **I sent it**, then check that the prospect is now
   `contacted`.
5. Record the reply as `unsubscribe`. The prospect should become
   `unsubscribed` and `lost`, and drafting for it should now return
   `suppressed`.
