# Sentry Alert Rules — AIWMC™ Quantis

All errors funnel through `logger.error(...)` in the UI and `console.error(...)`
in edge functions. Both end up in Sentry. Configure these rules in
**Sentry → Alerts → Create Alert Rule**.

> Note: alert rules are configured in the Sentry UI, not in code. This file is
> the source of truth for what to set; copy the values into Sentry.

## 1. UI — Error spike (post-deploy regression)

- Project: `quantis-ui`
- Type: **Issue Alert**
- When: `event.type:error`
- If `times_seen` ≥ **20** in **5 minutes**
- And `release` matches the latest deploy
- Action: Slack `#quantis-alerts` + email to `beltovbogdan@gmail.com`

## 2. UI — New issue introduced

- When: `is:new`
- Severity ≥ `error`
- Action: Slack `#quantis-alerts`

## 3. Edge functions — Error rate

- Project: `quantis-edge`
- Type: **Metric Alert**
- Metric: `count_if(level, equals, error)` over **15 min**
- Threshold: > **50** events
- Filter: `tags[function]:analyze-business OR tags[function]:export-document OR tags[function]:stripe-webhook`
- Action: PagerDuty `quantis-oncall`

## 4. Anthropic cost spike

- Project: `quantis-edge`
- Type: **Metric Alert** (custom — query `ai_calls` via Sentry's data source)
- Metric: `sum(cost_usd)` per **1 hour**
- Threshold: > **$5**
- Action: Slack `#quantis-cost`

## 5. Correlation — find a single run

Every UI log + edge log + `ai_calls` row carries `request_id` (format
`q_<base36-time>_<rand>`). To trace one analysis end-to-end:

```
# Sentry UI
tags[request_id]:q_xxxxxxx_yyyyyyy

# psql
select * from ai_calls where request_id = 'q_xxxxxxx_yyyyyyy' order by created_at;
```
