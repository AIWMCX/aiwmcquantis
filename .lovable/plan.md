
# Zero Activity Dashboard — Complete Root Cause Analysis

The image you shared is the Lovable project analytics dashboard — showing 0 visitors today in the preview environment. This is expected for the preview URL. The **real traffic data** from the production app (aiwmcquantis.lovable.app) shows 50 visitors and 143 pageviews in the past 7 days, so users ARE coming. The problem is not "no traffic" — it is that the **engagement tracking, activity scoring, churn signals, and notifications are all broken or misconfigured** in multiple places simultaneously.

Here is every bug found, root cause identified, and the fix plan.

---

## What the Data Actually Shows (Good News First)

From the production analytics pulled right now:

```text
Last 7 Days:
  Feb 13: 11 visitors, 31 pageviews
  Feb 15:  9 visitors, 13 pageviews
  Feb 16: 15 visitors, 39 pageviews
  Feb 17: 11 visitors, 22 pageviews

Sources: Direct (38), Facebook (2), VK (2), Claude.ai (1), Google (1)
Devices: Desktop (34), Mobile (13)
Countries: US (33), Russia (8)

Database:
  11 registered users
  2 Plus subscribers ($34 MRR)
  29 total analyses run
  3 active analyzers (one power user with 27 analyses)
```

Traffic exists. The dashboard you showed is the Lovable **preview iframe** analytics — it only tracks the dev preview URL, not production.

---

## Bug #1 — CRITICAL: `activity_score` Is Never Computed (Always 0)

**Root cause:** The `update_engagement_on_analysis` trigger updates `total_analyses`, `streak`, and `last_active_date` — but **never touches `activity_score`**. There is no function, trigger, or cron that computes it. It stays 0 for every user forever.

**Impact cascade:**
- `churn_risk_score` formula adds `Math.max(0, 20 - (activityScore / 5))` — since `activityScore` is always 0, every user gets the maximum 20 penalty points added
- `engagement_tier` is computed from risk score, so tiers are always wrong
- The `check-churn-signals` daily cron reads this 0 and miscalculates every user's risk
- In-app notifications are triggered based on wrong risk levels
- All retention interventions fire at wrong times

**Fix:** Add `activity_score` calculation to the `update_engagement_on_analysis` trigger function:
```sql
-- activity_score = (total_analyses * 10) + (total_exports * 15) + streak bonus
activity_score = LEAST(100, (total_analyses * 10) + (total_exports * 15) + (current_streak * 5))
```

---

## Bug #2 — CRITICAL: `warm-functions` Cron Returns 401 on Every Call

**Root cause confirmed from edge function logs:**
```text
POST | 401 | warm-functions  (2 consecutive 401s in logs)
```

The `warm-functions` cron job uses the `anon key` in the Authorization header, but the `warm-functions` edge function likely requires a service role key or has JWT verification enabled.

**Impact:** Every 5 minutes, the warm-functions cron fires and gets a 401. This means:
- All edge functions (analyze-business, check-lifecycle-emails, etc.) may be cold when users hit them
- Cold starts of 2-5 seconds on analysis requests
- The cron secret approach doesn't work because the anon key is sent instead of service role

**Fix:** Update the `warm-functions` cron job authorization header to use the service role key (stored as `app.service_role_key` setting), or update the warm-functions edge function to accept anon key calls.

---

## Bug #3 — CRITICAL: `CRON_SECRET` Secret Is Not Configured

**Root cause confirmed:**
```sql
SELECT current_setting('app.cron_secret', true) → NULL
```

The `check-churn-signals` and `send-weekly-insights` cron jobs both send `x-cron-secret` header. The edge functions check:
```typescript
if (!isServiceRole && cronSecret && providedSecret !== cronSecret) {
  return 401
}
```

Since `cronSecret` is `undefined`/empty, the `&&` short-circuits and the check passes. So cron calls DO work currently — but only by accident. If someone ever sets `CRON_SECRET`, both cron jobs would immediately break because the cron jobs read from `app.cron_secret` (database setting) but the edge functions read from `Deno.env.get("CRON_SECRET")` — **different sources**.

**Fix:** Either:
- Remove `CRON_SECRET` requirement from edge functions (use service role key verification only)
- Or properly set `CRON_SECRET` as a Supabase secret AND as a database setting consistently

---

## Bug #4 — HIGH: `check-lifecycle-emails` Cron Uses Anon Key

**Root cause:**
```sql
-- pg_cron job definition:
headers := '{"Authorization": "Bearer eyJhbG...anon_key..."}' 
```

The cron job sends the **anon key** to `check-lifecycle-emails`. The edge function then creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (correct), but the function authentication layer sees an anon-key request.

Currently the function has this bypass:
```typescript
if (!isCron && !isServiceRole && !authHeader.includes(SUPABASE_ANON_KEY)) {
  // still allow...
}
```
The anon key condition makes it pass through — so it technically works. But this is a security hole: **anyone with the anon key (which is public) can trigger lifecycle emails for all users.**

**Fix:** Replace anon key in the cron job with the service role key, or add proper cron secret validation.

---

## Bug #5 — HIGH: Zero Notifications Ever Created

**Confirmed:**
```sql
SELECT COUNT(*), MAX(created_at) FROM user_notifications → count:0, max:NULL
```

The `check-churn-signals` function creates notifications, but **it has never run successfully** in a way that triggered notifications. Reasons:
1. Activity score is 0, so risk calculations are skewed
2. Most users have `user_engagement` records with wrong risk scores
3. The threshold comparisons (`previousRisk <= 30` → `risk > 30`) never change correctly when `activity_score` is always 0
4. Only 2 users have `user_engagement` records at all (the trigger only fires when an analysis is saved — 9 users never ran an analysis)

**Fix:** Run `check-churn-signals` once manually after fixing `activity_score`, and ensure `user_engagement` records are created for ALL users, not just those who ran analyses.

---

## Bug #6 — MEDIUM: Bounce Rate is 59–89% — Needs Investigation

**From analytics:**
```text
Feb 15: 89% bounce rate
Feb 16: 73% bounce rate  
Feb 17: 73% bounce rate
```

Session duration on Feb 17 was only 91 seconds average (down from 1,569s on Feb 15). This correlates with the date — Feb 17 was when the icon redesign work happened. The bounce rate spike may indicate a visual regression from the icon/UI changes that's driving users away faster.

**Fix:** Review landing page first impression; the 73%+ bounce rate on mobile (13 of 50 visitors) needs investigation. The `/` route has 44 of 50 sessions — almost all users hit the landing and leave.

---

## Bug #7 — MEDIUM: `user_engagement` Records Only Exist for Analyzed Users

Only 2 of 11 registered users have `user_engagement` records (the ones who ran analyses). The other 9 users — including those who signed up and never ran an analysis — have no engagement tracking at all. The churn check skips them entirely for score-based interventions.

The `update_engagement_on_analysis` trigger creates the record only when an analysis fires. Users who sign up but never analyze are invisible to the retention system.

**Fix:** The `handle_new_user` function (which runs on auth.users insert) should also create a baseline `user_engagement` record with zeroed values.

---

## Implementation Plan

### Phase 1 — Database Fixes (Migration)

**1A. Fix `activity_score` computation in the trigger:**
```sql
-- Update update_engagement_on_analysis to compute activity_score
-- Add: activity_score = LEAST(100, (total_analyses * 10) + (current_streak * 5))
```

**1B. Create `user_engagement` records for all existing users who don't have one:**
```sql
INSERT INTO user_engagement (user_id, total_analyses, last_active_date, ...)
SELECT id, 0, NULL, ...
FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_engagement);
```

**1C. Fix `handle_new_user` to create engagement record on signup:**
```sql
-- Add INSERT INTO user_engagement when new user registers
```

**1D. Backfill `activity_score` for existing users based on their actual analyses:**
```sql
UPDATE user_engagement ue
SET activity_score = LEAST(100, 
  (SELECT COUNT(*) FROM analyses WHERE user_id = ue.user_id) * 10 + 
  COALESCE(ue.current_streak, 0) * 5
);
```

### Phase 2 — Fix `warm-functions` Edge Function Authentication

Update the `warm-functions` edge function to accept anon key OR update the cron job to use the service role key. The 401s need to stop.

### Phase 3 — Fix Cron Job Security

Update `check-lifecycle-emails` cron job pg_cron definition to use proper authorization, removing the security hole of accepting any anon key request.

### Phase 4 — Run Backfill on Churn Signals

After fixing activity_score and engagement records, manually trigger `check-churn-signals` to:
- Recompute churn risk for all 11 users
- Create appropriate notifications for the 9 users who never completed an analysis
- Set correct engagement tiers (most should be "dormant" or "churned" based on last activity)

### Phase 5 — Bounce Rate Investigation

After the retention fixes, review the landing page to address the 73-89% bounce rate. Mobile users (26% of traffic) are likely hitting UX friction. The StickyMobileCTA and hero section need auditing against current mobile viewport behavior.

---

## Files That Will Change

| File / Location | Change |
|---|---|
| Database migration | Fix `update_engagement_on_analysis` to compute `activity_score` |
| Database migration | Fix `handle_new_user` to create `user_engagement` row on signup |
| Database migration | Backfill existing users with correct `activity_score` |
| Database migration | Backfill `user_engagement` for users with no record |
| `supabase/functions/warm-functions/index.ts` | Fix 401 authentication issue |
| `supabase/functions/check-lifecycle-emails/index.ts` | Remove anon-key security bypass |

---

## Summary of What Was Zero and Why

| System | Status | Root Cause |
|---|---|---|
| Visitors "today" in dashboard | 0 | Preview URL — not production |
| Production visitors last 7 days | 50 real users | Working correctly |
| `activity_score` for all users | Always 0 | Trigger never computes it |
| `user_engagement` records | Only 2 of 11 users | Trigger fires on analysis only |
| In-app notifications ever sent | 0 | Wrong risk scores, missing records |
| `warm-functions` | Failing with 401 | Anon key sent, service role needed |
| Lifecycle emails working | Partially | 5 sent total, logic generally works |
