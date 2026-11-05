# AIWMC Quantis — Claude Code project guide

Read this first. It replaces rediscovery: do not re-derive what is written here.

## Token discipline (mandatory)
- **Search, don't read.** Use Grep with a narrow pattern and `head_limit`. Read a file only at the lines you need (`offset`/`limit`). Never read whole large files:
  - `src/integrations/supabase/types.ts`: 6.4k lines. Grep the table name instead.
  - `bun.lock`, `dist/`, `node_modules/`
- **Never dump unfiltered output.**
  - Browser console: always pass `pattern` and a small `limit`. The console persists across navigations, so most entries are old.
  - `gh run view --log`: always pipe through `grep`/`tail`.
  - SQL: select only the columns you need, with `limit`.
- **Wait once, don't poll.** For CI or deploys, use one blocking `gh pr checks <n> --watch` or one background command. Never a loop of short checks. Long chains go in `run_in_background`.
- **Trust this file over memory.** If something here is wrong, fix this file in the same PR.
- **Don't re-verify done work** unless there is new evidence.

## Stack
- React + Vite + TypeScript SPA on **Vercel**: `www.aiwmcquantis.com` is canonical; the apex 308-redirects to it.
- **Supabase** project ref `dmlxrvfyqsakyjomsvdj`: Postgres, Deno edge functions in `supabase/functions/*`, pg_cron.
- Shared edge code lives in `supabase/functions/_shared/`. Pure logic is kept in separate `.ts` files so vitest can import it.
- Prices: `src/config/tiers.ts` (Plus $17/mo or $168/yr, Pro $49/mo or $492/yr). Offers: `src/config/engagement-offers.ts`. **Never hard-code prices.**

## Commands
- Tests: `npx vitest run` (full suite ≈ 1.9k tests, ~3 min), or a single file `npx vitest run src/__tests__/x.test.ts`.
- Types: `npx tsc --noEmit -p tsconfig.app.json`. **Pre-existing errors are known.** `useAutoposter.ts` lines ~239–241 and tables missing from the generated types (`safety_evaluations`, `doc_generation_jobs`, `location_data`, `user_validation_progress`) are expected. Only judge errors in the files you changed.
- Lint changed files only: `npx eslint <files>`.
- Edge function check: `DENO_TLS_CA_STORE=system npx -y deno@2.1.4 check supabase/functions/<fn>/index.ts`.
- Deploy-coverage guard: `npx tsx scripts/verify-deploy-coverage.ts`.

## Release flow (how code reaches production)
1. **Branch → PR.** Merge only with **every check green** and explicit founder approval. There is no branch protection: a free private repo can't have it.
2. **Merge to main → CI.** After CI succeeds, the `Production Deploy` workflow runs:
   - DB migrations (`supabase db push`)
   - the ledger check (`scripts/verify-migration-ledger.mjs`)
   - edge functions
   - Vercel
3. **Deploy batching.** CI on main cancels older runs when commits land close together, and their deploys show "skipped". The deploy of the newest commit ships everything before it. Check the deploy for the **HEAD** commit.
4. **Edge functions deploy only if listed** in the `FUNCTIONS=()` array in `.github/workflows/production-deploy.yml`. Deliberate exclusions go in `supabase/functions/.deploy-ignore`. A function in both lists fails CI. Never "complete" deploys by un-excluding functions.
5. **Actions minutes cost money.** This is a Free-plan private repo with 2,000 min/month; overage is billed to the founder's card. Before adding a workflow, a push trigger or a cron, count its minutes; each job bills at least 1 minute.
   - semgrep and gitleaks run on PRs plus a weekly run; qoc-gate runs only on QOC paths.
   - CI on main skips the test suite, which already ran on the PR.
   - `Vercel Production Deploy (one-click)` is manual only. `Production Deploy` ships the frontend and rolls back on a failed smoke test.
   - **Self-hosted runner (free minutes):** every job uses `runs-on: ${{ vars.RUNNER || 'ubuntu-latest' }}`.
     - The repo variable `RUNNER=quantis-wsl` sends jobs to the runner `aiwmc-pc-wsl`. It runs in the founder's PC under WSL Ubuntu, in `/opt/actions-runner` as a systemd service, as user `ghrunner`.
     - Deleting that variable sends everything back to GitHub-hosted, which is billed: `gh variable delete RUNNER -R AIWMCX/aiwmcquantis`.
     - If the PC is off, jobs queue (deploys wait).
     - New workflows must use the same `runs-on` expression.
     - **Exception: `run-migrations` stays on `ubuntu-latest`.** From WSL the session pooler (port 5432) hangs on the Postgres TLS request, so `supabase link` always times out there. A link or `db push` failure now turns that job red on purpose; edge functions still deploy.
6. **Migrations.** Applying one by hand in production means you must add its ledger row, or the ledger check blocks every deploy. Intentionally unapplied files go in `supabase/migrations/.ledger-ignore`.

## Proving what's live (don't trust job status alone)
- **Edge function:** `GET https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/<fn>?health=1` returns a `commit_sha` to compare against main.
- **Frontend:**
  1. Fetch `/`, find `/assets/index-*.js`, then the lazy chunk (e.g. `assets/Autoposter-*.js`).
  2. Search it for a string your PR added. The index bundle does **not** contain the commit SHA.
- **Redirects:** use `curl.exe -sI`. PowerShell 5.1's `Invoke-WebRequest` does not follow 308.
- **New public routes** need: `App.tsx`; `scripts/generate-sitemap.ts` (its list regenerates `public/prerender-urls.txt` in `prebuild`; a page missing there ships with the homepage title and fails the visibility gate); `scripts/seo.routes.mjs`; a `RouteSEO.tsx` entry; and a body in `scripts/generate-static-bodies.mjs`. Add to `vercel.json` only for non-prerendered paths.

## Data rules
- **Internal accounts:** exclude emails matching `jeltov|beltov|aiwmc|jjbalaganvasya|glasswing|qatest|audit-test`, `quantis-e2e.test|quantis-test.com|mailnull`, `bel%@gmail.com` and `digitalhubshops@gmail.com` from every customer metric (beltovbogdan@ and digitalhubshops@ are the founder's; the rest are QA and fixture accounts). `funnel_events_clean` applies this since `20261102120000`. Always join to `auth.users` before trusting a count.
- **Metrics** use complete America/Denver days; report today separately as partial.
- **Metrics come from the `funnel_events_clean` view** (alias-mapped events, `is_internal`, `is_first_in_session`, `denver_day`), never raw `COUNT(*)` on `funnel_events`. `is_internal` is session-level and also covers founder-granted accounts (`founder_%`, `sub_plus_%`), `*.chatgpt.site` previews and `utm_medium=internal` / `utm_source=qa_test` links.
- **Traffic sources:** `admin_traffic_sources(p_days)` (admin-only RPC) returns external first-touch channels/sources plus clean per-event counts; `/admin/funnel` reads only this. Unattributed visits are `Direct / unknown`, never guessed.
- **`funnel_events` sessions are anonymous.** Rows tagged `metadata.internal_qa=true` are test traffic. Visiting production with `utm_*` params creates fake attribution, so don't, or tag the session afterwards.
- **Autoposter:**
  - The publisher only claims `status='scheduled'` rows.
  - `external_scheduled` means scheduled natively in LinkedIn; it is never posted by us.
  - `unknown` means the post may be live: check before rescheduling. Never retry a publish.
- **LinkedIn Growth (`/admin/linkedin-growth`, `li_*` tables):** nothing calls or reads LinkedIn; the founder sends every comment/DM by hand. A draft becomes `approved` only through `li-growth-draft` (server-side lint), and `sent`/`skipped`/outcomes only through the `li_mark_draft_sent` / `li_skip_draft` / `li_record_outcome` RPCs, which enforce the caps. Lint lives in `_shared/li-growth-lint.ts` (shared with the page).
- **Outreach:** the sender only claims `commercial_followups.status='approved'` with `send_requested_at` set. Never change caps, warm-up dates or `mail_settings.outreach_enabled` without founder approval.
  - Copy is fixed in `_shared/commercial/outreach-copy.ts` (`low_ask_v1`: one hiring-demo link with UTM, 50–90 words, lint-enforced). The model writes only a grounded opener.
  - The cadence is 2 touches (`MAX_SEQUENCE_STEP` in `_shared/mail/followup-order.ts`). Never add a step 3+.
- **Free lead intake:** the `lead-intake` function (pg_cron `lead-intake-form-d`, 11:30 UTC daily) turns new SEC Form D filings into `discovered` prospects in the "Form D funded owners" campaign, one batch per day. It inserts them with no email (`contact_channel` null), never guesses an address, and never drafts or sends. Filters live in `_shared/commercial/form-d.ts`. The Slack digest posts only if `LEADS_SLACK_WEBHOOK_URL` is set. EDGAR needs the identifying User-Agent and fewer than 10 requests a second.

## Windows / shell gotchas
- Python file edits: open with `newline=''` or line endings get rewritten, which shows as whole-file diffs. Prefer the Edit tool.
- Two updates to the same row in one SQL statement (multiple CTEs) silently keep only one.
- PowerShell 5.1 `Get-Content`/`Set-Content` re-encode UTF-8 files (mojibake, or a BOM with `-Encoding utf8`). Edit files with the Edit tool or Python (`newline=''`), never PowerShell.
- The build's prerender step fails on any route description over 160 characters (`RouteSEO.tsx` and the page's `PageSEO`). Count before pushing a new route.
- `funnel_events` has a CHECK allowlist on `event_name`; `recordFunnelEvent` is fire-and-forget, so a new name must be added by migration (guarded by `funnel-event-allowlist-sync.test.ts`).
- Do not `git stash -u` here: some untracked dirs are permission-locked and the stash half-applies.
- `.claude/launch.json` dev server: the preview tool may resolve a different project. Check the page title before testing.

## Truth rules (product)
- No guaranteed outcomes, predictive-accuracy claims, invented audits, subscriber counts, testimonials, ratings or scarcity.
- Numerical examples must declare their assumptions and be labelled *Illustrative*.
- Reference: `docs/marketing/2026-10-15-growth-principles.md` (the 16 principles; scarcity, social proof, FOMO and bandwagon need real evidence).
- **Marketing doctrine:** `supabase/functions/_shared/marketing-doctrine.ts` (16 principles + the 8 komanda-legend modules + human-writing stop-list + company truth) is prepended to every Content Studio and autoposter generation. Change it there, never per function; `marketing-doctrine.test.ts` guards it.
- The execution register lives in `docs/execution/`. Update it rather than starting a new audit.
