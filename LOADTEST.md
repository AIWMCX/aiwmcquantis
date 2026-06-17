# Quantis Load & Concurrency Harness (k6)

This suite proves Quantis holds up at 1, 10, 100, and 1,000 simultaneous
callers across every functional surface. It closes rows **10–12** of the
Stabilization Final Gate scoreboard.

## Hard rules

- **Staging + Stripe test mode only.** Every script aborts before its first
  request unless `K6_STRIPE_MODE=test` is set, and the GitHub workflow
  refuses to run if `K6_BASE_URL` looks like production.
- **Manual trigger only** (`workflow_dispatch`). Don't wire to push/PR — k6
  hits real edge functions and burns LLM/Tavily quota.
- **Error model:**
  - `HARD` = 5xx, timeout, network error, unhandled throw, or a 2xx body
    missing required fields. Counts against thresholds.
  - `BACKPRESSURE` = structured `429` or `{ error: 'high_demand' |
    'quota_exhausted' | 'feature_locked' | 'rate_limited' }`. **Expected
    and allowed** on the LLM-bound path.

## Local run

```sh
brew install k6   # or your platform's installer

export K6_BASE_URL="https://<staging-project>.supabase.co"
export K6_SUPABASE_ANON_KEY="<staging anon key>"
export K6_STRIPE_MODE=test
export K6_STRIPE_WEBHOOK_SECRET="<staging webhook secret>"
# For L10 only:
export K6_TEST_USER_JWTS='["jwt1","jwt2",...]'   # 50 paired entries
export K6_TEST_USER_IDS='["uid1","uid2",...]'

k6 run k6/01_health.js
k6 run --summary-export=summary.json k6/02_engine_only.js
```

## CI

GitHub → Actions → **Load & Concurrency (k6)** → Run workflow. Pick a phase:

| phase      | runs                            | when to use                    |
| ---------- | ------------------------------- | ------------------------------ |
| `quick`    | L1, L2                          | smoke before merging           |
| `security` | L4, L5, L8, L10                 | after any tier/limit change    |
| `money`    | L6, L7                          | after any stripe-webhook change |
| `all`      | L1–L10                          | pre-release gate               |

The job fails if **any** threshold is breached. Summaries land as a build
artifact (`k6-summaries-<run_id>/`).

## Pass/fail table → Final Gate mapping

| #   | Surface                       | Gate row | Pass condition                                                 |
| --- | ----------------------------- | -------- | -------------------------------------------------------------- |
| L1  | `?health=1` × all functions    | 10       | p99 < 300 ms; hard == 0                                        |
| L2  | Deterministic engine          | 10       | p95 < 800 ms; p99 < 1.5 s; complete-verdict ≥ 99.5%; hard == 0 |
| L3  | Full pipeline (1/10/100 VU)   | 12       | ≥99.5% at 1 & 10; at 100 hard == 0, backpressure-only          |
| L4  | Entitlement guard (Free →paid)| 11       | 100% `feature_locked`; **zero** paid compute                   |
| L5  | Usage cap (same identity ×50) | 11       | exactly 5 succeed; counter never > 5                           |
| L6  | Webhook idempotency (×50)     | 11       | one provision; 49 no-ops                                       |
| L7  | Webhook race                  | 11       | final row stable; no lost update                               |
| L8  | Rate limiter                  | 11       | clean 429 envelope; no 5xx                                     |
| L9  | Cold-start storm              | 10       | first-response p95 < 6 s                                       |
| L10 | RLS under concurrency         | 11       | zero cross-tenant rows                                         |

## Gate row definitions (extends the 9-row Stabilization scoreboard)

- **Row 10 — Concurrency: engine.** L1, L2, L9, L10 green.
- **Row 11 — Concurrency: money & entitlement.** L4, L5, L6, L7, L8 green.
- **Row 12 — Heavy-path backpressure.** L3 green (0 hard errors at 100
  concurrent; graceful envelopes only).

## Required staging setup

1. A staging Supabase project (`K6_BASE_URL`) mirroring prod schema + RLS.
2. Stripe **test** keys + a webhook endpoint pointing at the staging
   `stripe-webhook` function; `K6_STRIPE_WEBHOOK_SECRET` matches.
3. 50 seeded test users (script TBD). Their JWTs and IDs feed L10.
4. The staging `stripe-webhook` must accept fixtures stamped
   `X-K6-Replay: true` (CI-only branch — already implemented in the
   webhook code).

## Why this exists

The Final Gate proves each function deploys and answers, that entitlement
checks reject a forged claim, and that one duplicate webhook is idempotent.
It does **not** prove these hold under 100 or 1,000 simultaneous callers —
which is the only thing that matters at launch. This harness closes that
gap and ships its evidence as a CI artifact.
