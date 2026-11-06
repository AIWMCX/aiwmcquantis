# Cron secret: exposure review and rotation runbook (2026-11-06)

Scope: the shared secret that pg_cron sends in the `x-cron-secret` header to Quantis edge functions. In Supabase it is the edge secret `CRON_SECRET` and the Vault secret `quantis_shared_cron_secret`. On GitHub it is the `production` environment secret `CRON_SECRET`, which every Production Deploy copies into Supabase.

This file never contains a secret value. Values are identified by length and SHA-256 digest only.

## 1. What is in git

| Where | What | Value |
|---|---|---|
| `supabase/migrations/20260725195336_schedule_lifecycle_email_crons.sql:28, :40` | `x-cron-secret` literal in 2 cron jobs | A (64 hex) |
| `supabase/migrations/20260727012329_fix_publish_due_posts_cron_auth.sql:20` | `x-cron-secret` literal in job 2 (`autoposter-publish-due`) | A |
| `AIWMC_QUANTIS_MEGA_MASTER_PROMPT.md:48` (since 2026-06-13) | "CRON SECRET" constant | A, **removed by this PR** |
| `src/__tests__/vault-backed-cron-secret.test.ts:18-19` (PR #134, 2026-09-11) | values in `not.toContain(...)` | A and B, **removed by this PR** |
| branch `feature/evidence-service`, `supabase/migrations/20260810130000_evidence_shadow_worker_cron.sql:32` | `x-cron-secret` literal | A (never merged, never applied) |
| `supabase/migrations/20260421004535_*.sql:13`, `20260522052200_*.sql:28` | `Authorization`/`apikey` JWTs | `role=anon` of the retired project `gafxacjhkqsdzwwzhbor`: public by design, not a secret |

Digests (SHA-256 of the value):

- A: `c0dd826feb4091f45b4169c01468642ca28fb934c76ce8f6c36ec141aa2d0827`
- B: `3fc25b2d1a4541293bb0be4db71a251f3591c26b1d1064b1610aa1fb7763bf41`

What the repo's own records say about them (I could not check production from here):

- **A** was rotated out on 2026-08-18 (PR #48). `docs/QUANTIS_FINAL_ARCHITECTURE_SCOPE.md` row 5 says the old value returned 401 in production.
- **B** is the value `docs/execution/2026-08-27-canonical-register.md` records as **live** on 2026-09-11 (it was what `warm-functions-every-5min` sent, and the call returned 200). The same session copied it into Vault. No rotation has been recorded since. **Treat B as live and exposed:** it has been on `main` for 8 weeks, and it is in every branch cut since then (158 remote branches).

Removing B from `main` does not remove it from git history. Only a rotation makes the leak harmless. Rewriting history across 158 branches costs more than rotating, and buys nothing once the value is dead.

Outside git, the value also sits in `cron.job_run_details.command`, once for every past run of a job that carried it as a literal.

## 2. What someone holding the live value can trigger

pg_cron calls these 15 deployed functions, and each accepts `x-cron-secret` as its only credential. `verify_jwt` is no barrier: where it is on, the public anon key from the frontend bundle satisfies it.

| Function | What a call does | Risk |
|---|---|---|
| `oauth-linkedin-callback?init=1` (also accepts `?secret=`) | starts LinkedIn OAuth and then **upserts `autoposter_credentials` for `linkedin`** with whoever completes the login | **High.** Someone can swap the company's LinkedIn credential for their own account. Our scheduled posts then go to their account and stop reaching ours. The code comment says this secret is what "prevents anonymous attackers from hijacking the shared autoposter account". |
| `oauth-twitter-callback?init=1` (also `?secret=`) | same thing for X: stores the access and refresh tokens in Vault | **High**, same takeover |
| `run-accuracy-harness` | runs `analyze-business` once per golden vector | Medium: LLM spend for every call, and it writes `accuracy_runs` |
| `business-mail` (action `tick`) | IMAP sync, then at most 1 paced outreach send | Low to medium: `send-policy.ts` still enforces the daily cap, the gap and the window |
| `check-lifecycle-emails`, `send-weekly-insights` | user emails | Low: both dedupe (`email_sequence_log`, `newsletter_sends`). Calls fired in parallel could race the check (not tested) |
| `check-churn-signals` | inserts `user_notifications` | Low to medium: in-app notifications can repeat (dedupe not checked) |
| `publish-due-posts` | publishes posts that are already due | Low: it only claims `status='scheduled'` rows whose time has passed |
| `notify-checkout-intent` | emails the founder about new checkout starts | Low: deduped by `checkout_intent_alerts` |
| `lead-intake` | inserts Form D prospects (no email), one batch a day | Low |
| `reconcile-stripe-subscriptions` | report-only Stripe check | Low: Stripe API calls |
| `meta-credentials-setup` | re-stores the Meta token from env secrets into Vault | Low: idempotent, same values |
| `self-learning-update`, `doc-queue-worker`, `warm-functions` | recomputes priors, works the doc queue, pings functions | Low: compute cost |

Not deployed by CI (listed in `.deploy-ignore`): `aggregate-quality-metrics`, `ingest-data-sources`, `template-optimizer`. A copy from an earlier manual deploy may still be live; I did not check.

## 3. What this PR changes

- `supabase/migrations/20261106120000_cron_secret_literals_to_vault.sql` finds every `cron.job` that still sends `x-cron-secret` as a literal and rewrites only the header so it reads `vault.decrypted_secrets` (`quantis_shared_cron_secret`). The URL, body and schedule stay the same, and so does the value sent, so nothing has to be coordinated at merge time. Records point to `warm-functions-every-5min` and probably job 2. The migration:
  - changes nothing if the Vault secret is missing;
  - dry-runs each new command with `EXPLAIN`, which sends no request;
  - leaves any job in a form it does not know, with a NOTICE;
  - prints job ids and names only.
- Tested on real Postgres (PGlite 0.2.17) with stub `cron`, `vault` and `net` schemas, using fake values. 25/25 checks passed:
  - jobs in both literal forms are rewritten;
  - each rewritten job sends the Vault value with the same URL and Content-Type;
  - Vault-backed jobs, jobs without a header, mixed-case headers and `DO` blocks are left alone;
  - a missing Vault secret changes nothing;
  - a second run changes nothing.
- `src/__tests__/cron-secret-hygiene.test.ts` fails CI on any of these:
  - a literal `x-cron-secret` value anywhere except the 2 append-only migrations;
  - a long token on a line that names the cron secret;
  - A or B appearing anywhere (matched by digest);
  - a cron migration since 2026-09-11 that does not read Vault.
- Values A and B are removed from `vault-backed-cron-secret.test.ts` and from the master prompt.

## 4. Rotation steps (founder)

Do these **after this PR is merged and its Production Deploy is green**: from then on, cron jobs read only from Vault. The whole rotation takes about 10 minutes. For about a minute in the middle, cron calls may get 401. That is harmless: each job tries again on its next run, and publish-due-posts only takes posts that are already due.

**Step 0. Check that every job now reads Vault** (SQL editor; read-only; the output shows no value):

```sql
select jobid, jobname, command ilike '%vault.decrypted_secrets%' as reads_vault
from cron.job
where command ilike '%x-cron-secret%'
order by jobid;
```

Every row must show `reads_vault = true`. A `false` row is a job the migration did not recognise (its NOTICE in the run-migrations log names it). Change that job to the Vault pattern by hand before you continue.

**Step 0b (optional): confirm which value is live.** This compares only digests:

```sql
select encode(sha256(convert_to(decrypted_secret, 'UTF8')), 'hex') as digest
from vault.decrypted_secrets
where name = 'quantis_shared_cron_secret';
```

If the digest equals B in section 1, the value leaked on `main` is the live one. Either way, rotate.

**Step 1. Make a new value** on your PC (Git Bash). Don't paste it into chat, a doc, a commit or a ticket:

```bash
openssl rand -hex 32
```

**Step 2. GitHub first.** Every deploy copies this secret into Supabase, so if it still held the old value, the next deploy would undo the rotation. The command asks for the value without echoing it:

```bash
gh secret set CRON_SECRET --env production -R AIWMCX/aiwmcquantis
```

**Step 3. Supabase edge secret.** Dashboard → Edge Functions → Secrets → `CRON_SECRET` → set the new value.

**Step 4. Vault, right after step 3** (SQL editor). Paste the value, run the statement, then delete it from the editor. **Don't save it as a snippet:** saved snippets keep the query text.

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'quantis_shared_cron_secret'),
  'PASTE_NEW_VALUE_HERE'
);
```

**Step 5. Redeploy.** In GitHub Actions, run `Production Deploy` (workflow_dispatch) on `main`. It copies the GitHub secret into Supabase (the same value as step 3) and redeploys the edge functions so new instances read it.

**Step 6. Verify the new value works.** Wait 10 minutes, then (read-only):

```sql
select status_code, count(*)
from net._http_response
where created > now() - interval '10 minutes'
group by 1
order by 1;
```

Expect `200` rows and no `401`. `publish-due-posts` runs every minute and `warm-functions` every 5, so both show up.

**Step 7. Verify the old values are dead** (Git Bash, from the repo root). Each command reads the old value from git and prints only the HTTP status. Expect `401` twice:

```bash
OLD=$(grep -o '"x-cron-secret":"[^"]*"' supabase/migrations/20260727012329_fix_publish_due_posts_cron_auth.sql | cut -d'"' -f4); curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "x-cron-secret: $OLD" https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/warm-functions; unset OLD
```

```bash
OLD=$(git show adb305dc:src/__tests__/vault-backed-cron-secret.test.ts | sed -n 19p | grep -oE '[0-9a-f]{64}'); curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "x-cron-secret: $OLD" https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/warm-functions; unset OLD
```

**Step 8 (optional): clean up run history.** This is a production delete, so it's your call. Once the old values are dead, these rows are only clutter:

```sql
delete from cron.job_run_details
where command ilike '%x-cron-secret%'
  and command not ilike '%vault.decrypted_secrets%';
```

**Step 9. Log it.** Add a line to `quantis-brain/OPS-LOG.md` and to `docs/execution/release-log.md` with the date, the digest of the new value (from step 0b, never the value) and the step 6/7 results.

## 5. Not in this PR (follow-ups)

- `oauth-linkedin-callback` and `oauth-twitter-callback` still accept the cron secret, through the header or `?secret=` in the URL, to start an OAuth login.
  - A secret in a URL ends up in browser history and request logs.
  - An admin action should not share a credential with cron.
  - LinkedIn already has an admin-JWT `start` action. Moving X to the same pattern and removing `init=1` would end the account-takeover path.
- Every function compares the secret with `!==`. A constant-time comparison is better practice; this is minor.
- If `feature/evidence-service` is ever revived, switch its `20260810130000` cron migration to the Vault pattern before merging. It was never applied, so it can be edited on the branch. `cron-secret-hygiene.test.ts` will fail it until then.
- The `process-subscription-downgrades-hourly` and `autoposter-publish-due` jobs were first created against the retired project URL (`gafxacjhkqsdzwwzhbor`). Job 2 was fixed later. Check that no job still calls the retired project:

  ```sql
  select jobid, jobname from cron.job where command ilike '%gafxacjhkqsdzwwzhbor%';
  ```
