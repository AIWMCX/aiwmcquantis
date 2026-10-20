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
5. **Migrations.** Applying one by hand in production means you must add its ledger row, or the ledger check blocks every deploy. Intentionally unapplied files go in `supabase/migrations/.ledger-ignore`.

## Proving what's live (don't trust job status alone)
- **Edge function:** `GET https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/<fn>?health=1` returns a `commit_sha` to compare against main.
- **Frontend:**
  1. Fetch `/`, find `/assets/index-*.js`, then the lazy chunk (e.g. `assets/Autoposter-*.js`).
  2. Search it for a string your PR added. The index bundle does **not** contain the commit SHA.
- **Redirects:** use `curl.exe -sI`. PowerShell 5.1's `Invoke-WebRequest` does not follow 308.
- **New SPA routes** must be registered in `App.tsx`, `scripts/verify-internal-links.mjs` and `vercel.json`.

## Data rules
- **Internal accounts:** exclude emails matching `jeltov|aiwmc|jjbalaganvasya` from every customer metric. Always join to `auth.users` before trusting a count.
- **Metrics** use complete America/Denver days; report today separately as partial.
- **Metrics come from the `funnel_events_clean` view** (alias-mapped events, `is_internal`, `is_first_in_session`, `denver_day`), never raw `COUNT(*)` on `funnel_events`. `is_internal` is session-level and also covers founder-granted accounts (`founder_%`, `sub_plus_%`), `*.chatgpt.site` previews and `utm_medium=internal` / `utm_source=qa_test` links.
- **Traffic sources:** `admin_traffic_sources(p_days)` (admin-only RPC) returns external first-touch channels/sources plus clean per-event counts; `/admin/funnel` reads only this. Unattributed visits are `Direct / unknown`, never guessed.
- **`funnel_events` sessions are anonymous.** Rows tagged `metadata.internal_qa=true` are test traffic. Visiting production with `utm_*` params creates fake attribution, so don't, or tag the session afterwards.
- **Autoposter:**
  - The publisher only claims `status='scheduled'` rows.
  - `external_scheduled` means scheduled natively in LinkedIn; it is never posted by us.
  - `unknown` means the post may be live: check before rescheduling. Never retry a publish.
- **Outreach:** the sender only claims `commercial_followups.status='approved'` with `send_requested_at` set. Never change caps, warm-up dates or `mail_settings.outreach_enabled` without founder approval.

## Windows / shell gotchas
- Python file edits: open with `newline=''` or line endings get rewritten, which shows as whole-file diffs. Prefer the Edit tool.
- Two updates to the same row in one SQL statement (multiple CTEs) silently keep only one.
- Do not `git stash -u` here: some untracked dirs are permission-locked and the stash half-applies.
- `.claude/launch.json` dev server: the preview tool may resolve a different project. Check the page title before testing.

## Truth rules (product)
- No guaranteed outcomes, predictive-accuracy claims, invented audits, subscriber counts, testimonials, ratings or scarcity.
- Numerical examples must declare their assumptions and be labelled *Illustrative*.
- Reference: `docs/marketing/2026-10-15-growth-principles.md` (the 16 principles; scarcity, social proof, FOMO and bandwagon need real evidence).
- The execution register lives in `docs/execution/`. Update it rather than starting a new audit.
