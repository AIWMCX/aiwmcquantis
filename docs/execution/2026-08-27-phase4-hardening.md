# Phase 4 — Minor Supabase hardening

## pg_net namespace (4.6-4.9)

### 4.6 — Full dependency inventory, live-queried

- **Extension location**: `pg_extension` shows `pg_net` v0.19.5 currently
  attributed to the **`public`** schema — this is the exact thing the
  Supabase security advisor's "Extension in Public Schema: pg_net"
  finding refers to. Confirmed via
  `SELECT extname, nspname FROM pg_extension JOIN pg_namespace ...`.
- **Real, active `pg_cron` jobs calling `net.http_post()`** — queried
  `cron.job` directly, 5 jobs found, all real and currently scheduled:
  - `autoposter-publish-due` — every minute
  - `check-lifecycle-emails-hourly` — hourly
  - `process-subscription-downgrades-hourly` — hourly
  - `send-weekly-insights-mondays` — weekly
  - `warm-functions-every-5min` — every 5 minutes

  Every one of these calls the bare, schema-qualified `net.http_post(...)`
  function name (not `public.net.http_post`, not an unqualified
  `http_post` relying on `search_path`). **This detail is exactly why
  the move is very likely safe**: `pg_net` creates and owns a dedicated
  `net` schema for its actual functions/tables regardless of which
  schema its *extension control record* is attributed to.
  `ALTER EXTENSION pg_net SET SCHEMA extensions` (the standard Supabase-
  recommended fix) only changes the extension's own metadata
  attribution — it does **not** move or rename the `net` schema or its
  functions. Every cron job's `net.http_post(...)` call would continue
  to resolve identically before and after the move.
- **Application-code callers**: searched every function body in the
  database for `net.http_*` — **zero** application-level Postgres
  functions (triggers, `SECURITY DEFINER` functions) call it directly;
  only the 5 cron jobs above do.
- **Secret handling note**: two of the five cron job definitions embed
  live secrets in their command text (`x-cron-secret` header value,
  and one job's `Authorization: Bearer <anon-JWT>` header). These values
  were visible in the live query result used for this inventory and are
  **deliberately not reproduced in this document or anywhere in this
  repo** — per the operating rule against putting secrets in logs/docs.

### 4.7 — Is the move supported in this environment?

`ALTER EXTENSION pg_net SET SCHEMA extensions` is Supabase's own
documented remediation for this advisory finding and is a standard,
supported operation on their managed Postgres — it does not require
dropping/recreating the extension, and per 4.6's finding, does not
touch the `net` schema's own function definitions that the cron jobs
depend on.

### 4.8 — Preview rehearsal

**Not possible in this session.** This environment has no working local
Supabase/Docker stack (the same gap already noted for pgTAP execution
throughout this audit) and no separate Preview branch of this specific
production database was created to rehearse against. The charter's own
sequencing (4.8 before 4.9) is explicit that rehearsal must happen
*before* the move, not be skipped.

### 4.9 — Decision

Per the charter's own instruction — **"Move it only if the security/
maintenance benefit is real and rollback is proven. Otherwise document
the accepted exception; do not change production for cosmetic
hygiene."** — the honest conclusion given the current constraint is:

**Deferred, documented exception.** The technical risk assessment
actually favors the move being safe (4.6's finding that no cron job's
`net.http_post` call would be affected), but "very likely safe based on
schema-attribution mechanics" is not the same as "rehearsed and proven"
per 4.8's explicit requirement, and this session has no way to rehearse
it. Recommend the founder either (a) accept this as a standing,
documented exception (the security benefit is cosmetic — an advisory
label change, not a real access-control gap, since `pg_net`'s own
functions were never in `public` regardless of the extension's
namespace attribution), or (b) create a genuine Supabase branch/Preview
environment specifically to rehearse this one operation before applying
it to production. This closes the standing "do it anyway, or leave it?"
question with an actual inventory and risk assessment, superseding the
prior unanswered/uninvestigated state.

## Leaked-password protection (4.1-4.5)

**Not actioned this session.** Per the charter's own ownership split —
"Founder for dashboard settings; coding agent for verification" — this
requires a manual toggle in the Supabase Dashboard's Auth settings that
no available tool can perform. 4.1 (confirm plan availability) was not
independently re-verified this session; carrying forward the
prior-session status of "blocked, pending manual dashboard action."
