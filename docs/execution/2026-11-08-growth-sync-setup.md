# Growth sync setup: GA4 + Search Console in /admin/growth (2026-11-08)

What it does: the `growth-sync` edge function copies Google Analytics 4 (property
520326058, `G-NZE7RGVNEN`) and Search Console (`sc-domain:aiwmcquantis.com`) daily
metrics into `public.ext_metrics_daily`. `/admin/growth` shows them next to our own
Supabase funnel. Optional: Microsoft Clarity. It only reads from Google and Microsoft.

No secret values belong in this file, in git, or in chat. Each one goes straight into
Supabase → Edge Functions → Secrets.

## 1. Google Cloud: project, APIs, service account (about 10 minutes)

Use any Google login you control (jeltovbogdan@gmail.com is fine).

> **Production values (done 2026-11-08):** GCP project `ethereal-link-514104-u9`; service account
> `quantis-analytics-reader@ethereal-link-514104-u9.iam.gserviceaccount.com` (GA4 520326058: Viewer,
> added by aiwmcsrm@gmail.com; Search Console sc-domain:aiwmcquantis.com: Restricted). Do NOT use
> project `ascendant-braid-460703-q1` (jeltovbogdan): it is suspended (billing account closed).
> The steps below are for re-creating it from scratch.

1. Open https://console.cloud.google.com/ → project picker (top bar) → **New project**
   (or reuse `ethereal-link-514104-u9`). No organization, no billing needed. **Create**, then select it.
2. **APIs & Services → Library**. Search and **Enable** each:
   - **Google Analytics Data API**
   - **Google Search Console API**
3. **IAM & Admin → Service accounts → + Create service account**.
   - Name: `growth-sync`. **Create and continue**.
   - Roles: leave empty (access is granted inside GA4 and Search Console, not here). **Done**.
4. Copy the service account email. It looks like
   `quantis-analytics-reader@ethereal-link-514104-u9.iam.gserviceaccount.com`. You need it in steps 2 and 3.
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

## 6. Phase 2: SEO / GEO / AEO sources (PageSpeed, indexing, IndexNow, Bing)

Same function, same tables, same daily cron; `/admin/growth` gains a **Tool status** strip
(GA4, Search Console, Clarity, PageSpeed, Indexing, IndexNow, Bing) and four sections.
Nothing below is required for the page to work; each source that is not set up shows as
"not configured" or explains what it needs.

| Source | Calls a day | Needs |
|---|---|---|
| PageSpeed Insights (5 key pages × mobile/desktop) | 10 | nothing; optional `GOOGLE_API_KEY` |
| Search Console sitemaps.list | 1 | the existing service account |
| Search Console URL Inspection (8 pages) | 8 of the 2,000/day quota | the existing service account; may need **Full** permission |
| IndexNow | one ping per production deploy | nothing new (uses the existing `CRON_SECRET` GitHub secret) |
| Bing Webmaster | 2 | optional `BING_WEBMASTER_API_KEY` |

### Optional `GOOGLE_API_KEY` (PageSpeed Insights)

PSI answers without a key at low volume, but keyless calls from Supabase's shared servers
can get HTTP 429. With a key the quota is your own.

1. https://console.cloud.google.com/ → project **`ethereal-link-514104-u9`**.
2. **APIs & Services → Library**: enable **PageSpeed Insights API** and **Chrome UX Report API**.
3. **APIs & Services → Credentials → + Create credentials → API key**.
4. Open the new key → **API restrictions → Restrict key** → tick only
   **PageSpeed Insights API** and **Chrome UX Report API** → **Save**.
   (Application restrictions: leave "None"; the call comes from Supabase, not a browser.)
5. Supabase → Edge Functions → Secrets → add `GOOGLE_API_KEY` with the key value.

### Search Console permission for URL Inspection

The service account is a **Restricted** user on `sc-domain:aiwmcquantis.com`. Google does not
document which permission level the URL Inspection API and `sitemaps.list` need. If either
returns HTTP 403, `growth-sync` records the source as `permission_denied` with Google's exact
message in `ext_sync_runs.details.endpoints`, and the page shows
"needs Full permission in Search Console". The other sources keep running. To fix it:
Search Console (as jeltovbogdan@gmail.com) → **Settings → Users and permissions** → the
service account → **Full** → run **Run sync now**.

### IndexNow results

`scripts/indexnow-ping.mjs` (the non-blocking step after the production smoke test) now POSTs
its result to `growth-sync` (`mode: 'ping'`) with the `x-cron-secret` header, using the
`CRON_SECRET` GitHub `production` secret that already exists. No new secret. The
`ping` mode only accepts the cron secret, never an admin login. The first row appears after
the next production deploy.

### Optional `BING_WEBMASTER_API_KEY`

1. https://www.bing.com/webmasters → sign in → add and **verify**
   `https://www.aiwmcquantis.com/` (the simplest route is **Import from Google Search Console**).
2. **Settings (gear) → API access → API Key → Generate**.
3. Supabase → Edge Functions → Secrets → add `BING_WEBMASTER_API_KEY` with the key value.
4. **Run sync now**: the Bing chip turns **connected**. Each call returns Bing's recent
   history, so there is nothing to backfill.

## Troubleshooting (the error text shows on the status card)

| Error | Fix |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON is not set` / `not valid JSON` | Step 4: paste the full file content, including the braces |
| `Google token exchange failed: invalid_grant` | The key was deleted or disabled; create a new key (step 1.5) and replace the secret |
| GA4 `PERMISSION_DENIED` | Step 2 not done, or done on the wrong property |
| GA4 / GSC `... has not been used in project ... or it is disabled` | Step 1.2: enable the API, wait 5 minutes, run again |
| GSC `User does not have sufficient permission for site` | Step 3 not done, or `GSC_SITE_URL` is not exactly `sc-domain:aiwmcquantis.com` |
| Clarity `HTTP 429` | Clarity allows 10 calls a day; wait until tomorrow |
| PageSpeed `HTTP 429 RESOURCE_EXHAUSTED` | Keyless quota used up; add `GOOGLE_API_KEY` (section 6) |
| PageSpeed `API key not valid` / `API_KEY_SERVICE_BLOCKED` | The key's API restrictions must include PageSpeed Insights API |
| Indexing `permission_denied` | Section 6: give the service account **Full** in Search Console |
| Bing `ErrorCode ... InvalidApiKey` / `NotAuthorized` | Regenerate the key, or the site is not verified in Bing for that login |

## Key rotation

GCP → service account → **Keys → Add key** (new JSON) → replace `GOOGLE_SERVICE_ACCOUNT_JSON`
in Supabase → run **Run sync now** → delete the old key in GCP.

## Undo

Remove the service account from GA4 and Search Console, delete the GCP project, delete the
four secrets. The rollback SQL is at the top of
`supabase/migrations/20261108120000_growth_sync_ext_metrics.sql`.
