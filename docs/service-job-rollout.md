# Service Job Quoting — Rollout & Operations

Feature flag key: **`service_job`**
Client env var: **`VITE_FLAG_SERVICE_JOB`**
Localstorage override: **`flag:service_job`** = `1` or `0`
Owner: AIWMC Quantis platform team

---

## 1. Enable for a SINGLE user (private beta override)

There is no DB-backed flag table for `service_job` in v1 — keep ops surface small.
A single user can be opted-in directly in the browser without redeploying:

```js
// In the user's browser devtools (or sent to them as a one-tap link)
localStorage.setItem('flag:service_job', '1');
location.reload();
```

For zero-touch onboarding of a beta user, send them this link:

```
https://aiwmcquantis.com/?enable_service_job=1
```

*(Add the 3-line bootstrap in `index.html` if you want auto-opt-in via URL — not done in v1 to keep blast radius zero.)*

To revoke for that user:

```js
localStorage.setItem('flag:service_job', '0');
```

---

## 2. Enable GLOBALLY (production rollout)

Set the Vite env var at build time and redeploy:

```
VITE_FLAG_SERVICE_JOB=true
```

The flag is read at `import.meta.env.VITE_FLAG_SERVICE_JOB`. Per-user localStorage overrides still win — that's intentional so an opted-out tester can disable it without an env change.

---

## 3. Kill switch (instant disable)

Two ways, in order of speed:

1. **Frontend kill (fastest, no redeploy needed for tested users)** — anyone who can publish to the CDN bucket can drop a one-line patch that hard-codes `isEnabled('service_job') === false`. Do this in `src/lib/flags.ts`:
   ```ts
   export function isEnabled(flag: FlagKey): boolean {
     if (flag === 'service_job') return false; // KILL SWITCH
     const override = localStorage.getItem(`flag:${flag}`);
     if (override === '1') return true;
     if (override === '0') return false;
     return !!import.meta.env[`VITE_FLAG_${flag.toUpperCase()}`];
   }
   ```
   Publish. All routes (`/quote*`) `Navigate` to `/app` and the sidebar entry disappears.

2. **Backend kill (data-layer)** — if the calculator itself is misbehaving and you cannot redeploy:
   - Run an `UPDATE service_job_trades SET active = false WHERE id = 'electrical';` migration. The wizard step 2 will load 0 assemblies and the user cannot proceed.
   - For total lock: revoke the RLS policies on `service_jobs` (migration). Reads/writes start failing with `PGRST 401`; the UI surfaces the toast `Could not load quotes.`

Note: existing already-computed quotes remain in the DB and viewable when the flag is re-enabled — no data loss.

---

## 4. Smoke-test checklist (after every rollout stage)

Run in **<3 minutes** by one engineer or PM:

- [ ] Sidebar shows **Instant Quotes · Beta** under ANALYSIS (with the flag on).
- [ ] `/quote` loads, empty state visible for a fresh user.
- [ ] Click **New Quote** → wizard at step 1, Electrical pre-selected, Plumbing enabled, HVAC disabled with "Coming soon".
- [ ] Add **3 assemblies**, set qty + difficulty → **Next** persists (network: PATCH to `service_jobs`).
- [ ] Toggle **Emergency** → Next.
- [ ] Default pricing → **Calculate** completes in **< 3s** total (calc itself < 250 ms — see perf budget).
- [ ] Result page: 3 price bands appear in order **Aggressive < Balanced < Defensive**, breakdown bar renders, ≥1 risk card visible, **Send as PDF** downloads a non-empty PDF.
- [ ] Refresh — quote re-loads from DB (RLS read works).
- [ ] Console contains structured events:
  - `service_job.created`
  - `service_job.quote_computed` (with `duration_ms`, `iteration_count: 10000`)
  - `service_job.pdf_generated`
- [ ] No `service_job.error` events.
- [ ] Flag off (`localStorage.setItem('flag:service_job','0')`) → `/quote` redirects to `/app`, sidebar entry disappears.

If any check fails, execute the kill switch (§3) and roll back.

---

## 5. Observability — what to look for

All events use the structured `logger` (`src/lib/logger.ts`) → Sentry breadcrumbs in prod, colored console in dev.

| Event | Where | Useful metadata |
|---|---|---|
| `service_job.created` | `createJob` | `job_id`, `trade_id`, `userId` |
| `service_job.quote_computed` | `computeAndSaveQuote` | `duration_ms`, `iteration_count`, `scope_items`, `risk_count` |
| `service_job.pdf_generated` | `logPdfGenerated` (client) | `job_id`, `duration_ms` |
| `service_job.outcome_recorded` | `recordOutcome` | `job_id`, `has_actual_cost`, `has_revenue` |
| `service_job.error` | every route's catch | `route`, `error_class`, error |

**Perf budget**: `calculateQuote` warns to console if it exceeds **250 ms** for a 10-iteration × 10-assembly job (constant `PERF_BUDGET_MS` in `src/lib/service-job/calculator.ts`). Watch for that line; if it appears in prod, reduce `MC_ITERATIONS_DEFAULT` or move calculation off the main thread.

---

## 6. 5-line beta-user activation summary

1. Ask user to open `aiwmcquantis.com` and sign in.
2. In devtools console run `localStorage.setItem('flag:service_job','1'); location.reload();`
3. They'll see **Instant Quotes · Beta** in the sidebar.
4. Watch Sentry for `service_job.*` events from their `userId`.
5. To revoke: same command with `'0'` — or hit the kill switch in §3 if it's an emergency.
