# Growth sync setup: GA4 + Search Console in /admin/growth (2026-11-08)

What it does: the `growth-sync` edge function copies Google Analytics 4 (property
520326058, `G-NZE7RGVNEN`) and Search Console (`sc-domain:aiwmcquantis.com`) daily
metrics into `public.ext_metrics_daily`. `/admin/growth` shows them next to our own
Supabase funnel. Optional: Microsoft Clarity. It only reads from Google and Microsoft.

No secret values belong in this file, in git, or in chat. Each one goes straight into
Supabase → Edge Functions → Secrets.

## 1. Google Cloud: project, APIs, service account (about 10 minutes)

Use any Google login you control (jeltovbogdan@gmail.com is fine).

1. Open https://console.cloud.google.com/ → project picker (top bar) → **New project**.
   Name: `aiwmc-growth-sync`. No organization. **Create**, then select it.
2. **APIs & Services → Library**. Search and **Enable** each:
   - **Google Analytics Data API**
   - **Google Search Console API**
3. **IAM & Admin → Service accounts → + Create service account**.
   - Name: `growth-sync`. **Create and continue**.
   - Roles: leave empty (access is granted inside GA4 and Search Console, not here). **Done**.
4. Copy the service account email. It looks like
   `growth-sync@aiwmc-growth-sync.iam.gserviceaccount.com`. You need it in steps 2 and 3.
5. Open the service account → **Keys → Add key → Create new key → JSON → Create**.
   A `.json` file downloads. Keep it only until step 4, then delete it.
   (If key creation is blocked by the policy `iam.disableServiceAccountKeyCreation`, the
   project sits under an organization: recreate it with "No organization".)

## 2. GA4: give the service account Viewer on property 520326058

1. Sign in to https://analytics.google.com/ as **aiwmcsrm@gmail.com**.
2. Account "AIWMC™ v1 by Kerry" (380977247) → property "AIWMC Quantis™" (**520326058**).
3. **Admin** (gear, bottom left) → under *Property*: **Property access management**.
4. **+ → Add users**. Email: the service account email. Role: **Viewer**.
   Untick "Notify new users by email". **Add**.

Do not use the secondary property 559317308 (`G-08096HWB3B`); it has no history.

## 3. Search Console: add the service account as a Full user

1. Sign in to https://search.google.com/search-console as **jeltovbogdan@gmail.com** (sole Owner).
2. Property **sc-domain:aiwmcquantis.com** (the Domain property, not a URL-prefix one).
3. **Settings → Users and permissions → Add user**.
   Email: the service account email. Permission: **Full**. **Add**.

## 4. Supabase: set the edge secrets

Supabase Dashboard → project `dmlxrvfyqsakyjomsvdj` → **Edge Functions → Secrets** → **Add new secret**:

| Name | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The whole content of the downloaded `.json` file, pasted as is |
| `GA4_PROPERTY_ID` | `520326058` |
| `GSC_SITE_URL` | `sc-domain:aiwmcquantis.com` |
| `CLARITY_API_TOKEN` (optional) | Clarity → project → **Settings → Data Export → Generate new API token** (needs Clarity project admin, signed in as jeltovbogdan@gmail.com) |

Then delete the downloaded `.json` file from Downloads and empty the Recycle Bin.

`CRON_SECRET` already exists (shared by every pg_cron function); nothing to do for it.
Without `CLARITY_API_TOKEN` the page shows Clarity as "not configured"; that is fine.

## 5. After the PR is merged and deployed

1. Check the function is live: open
   `https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/growth-sync?health=1`.
   `commit_sha` must match the merge commit on main.
2. Open https://www.aiwmcquantis.com/admin/growth → **Run sync now**.
   All three status cards should turn **ok** (Clarity: **not configured** if no token).
3. Click **Backfill history** once and confirm. It walks 17 months, one call per month
   (GA4 from 2026-01-01, Search Console from 16 months back). Leave the tab open until
   the progress line disappears (a few minutes). Running it again is safe: rows upsert.
4. From then on the pg_cron job `growth-sync-daily` runs at 13:15 UTC every day and
   re-fetches the last 5 days.

## Troubleshooting (the error text shows on the status card)

| Error | Fix |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON is not set` / `not valid JSON` | Step 4: paste the full file content, including the braces |
| `Google token exchange failed: invalid_grant` | The key was deleted or disabled; create a new key (step 1.5) and replace the secret |
| GA4 `PERMISSION_DENIED` | Step 2 not done, or done on the wrong property |
| GA4 / GSC `... has not been used in project ... or it is disabled` | Step 1.2: enable the API, wait 5 minutes, run again |
| GSC `User does not have sufficient permission for site` | Step 3 not done, or `GSC_SITE_URL` is not exactly `sc-domain:aiwmcquantis.com` |
| Clarity `HTTP 429` | Clarity allows 10 calls a day; wait until tomorrow |

## Key rotation

GCP → service account → **Keys → Add key** (new JSON) → replace `GOOGLE_SERVICE_ACCOUNT_JSON`
in Supabase → run **Run sync now** → delete the old key in GCP.

## Undo

Remove the service account from GA4 and Search Console, delete the GCP project, delete the
four secrets. The rollback SQL is at the top of
`supabase/migrations/20261108120000_growth_sync_ext_metrics.sql`.
