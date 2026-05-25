# Service Job Quoting — End-to-End Manual Test Plan

> Project has no Playwright/Cypress harness (only `tests/k6-doc-generation.js`).
> Per Prompt-7 guardrails: "Do not modify the existing test infrastructure" — so the
> e2e is documented as a deterministic manual script, runnable in <5 minutes.
> Unit-level coverage lives in `src/lib/service-job/__tests__/calculator.test.ts`
> (10 tests, all passing).

## Preconditions

- Logged-in user on `https://aiwmcquantis.com` (or preview URL).
- Flag on: `localStorage.setItem('flag:service_job','1'); location.reload();`
- DevTools console + Network panel open.

## Steps & expected results

| # | Action | Expect |
|---|---|---|
| 1 | Click **Instant Quotes · Beta** in sidebar | Lands on `/quote`. Empty state if first time. |
| 2 | Click **New Quote** | `/quote/new`, wizard at step 1, Electrical pre-selected. |
| 3 | Fill: client `Acme Diner`, ZIP `80202`, address `1234 Main`, building `Commercial`, year `1985`. Click **Next** | Network: `POST service_jobs` → 201. Console: `service_job.created`. Step indicator advances to 2. |
| 4 | Search **outlet**, add `OUTLET-STD` (qty 6, difficulty 1.0). Search **breaker**, add `BREAKER-20A` (qty 2). Search **fixture**, add `FIXTURE-LED-2x4` (qty 4). Click **Next** | Network: `PATCH service_jobs` → 200. Step 3 visible. |
| 5 | Toggle **After-hours** on. Set Access difficulty slider to 1.4×. Click **Next** | `PATCH` 200. Step 4 visible with defaults pre-filled (rate $95, margin 25%, etc.). |
| 6 | Click **Calculate** | `PATCH` then `quote_result` write. Console: `service_job.quote_computed` with `duration_ms < 250`, `iteration_count: 10000`. Navigates to `/quote/<id>/result`. |
| 7 | Inspect result page | Three PriceBandCards in monotonic order: **Aggressive < Balanced < Defensive**. Balanced has "Recommended" badge. Cost-breakdown stacked bar + 4 legend cells render. At least 1 RiskFlagCard visible (likely `AFTER_HOURS` + `BUILDING_AGE` since year 1985 is at the boundary — actually 1985 is the cutoff exclusive, so AFTER_HOURS at minimum). |
| 8 | Click **Send as PDF** | Browser triggers a download `quote-Acme_Diner.pdf` ≥ 4 KB. Console: `service_job.pdf_generated` with `duration_ms`. |
| 9 | Click the **Send beta feedback on this quote →** link at page bottom | Mail client opens with subject `Quote Engine Feedback — <job_id>` and pre-filled body. |
| 10 | Open Supabase SQL editor (admin only): `INSERT INTO service_job_outcomes (job_id, actual_labor_hours, actual_materials_cost, actual_total_cost, actual_revenue) VALUES ('<job_id>', 14, 320, 1450, 2100);` | Insert succeeds (RLS allows owner). |
| 11 | Reload the result page | "Actual vs estimated" card now appears at the bottom with 4 cells: Est. cost, Actual cost, Revenue, Variance %. |

## Failure → action

- Any step throws a red toast → check console for `service_job.error` with `route` metadata, attach to a bug.
- `service_job.quote_computed` `duration_ms > 250` → file a perf regression, see rollout doc §5.

## Re-run cadence

Run this script:
- Before flipping `VITE_FLAG_SERVICE_JOB=true` globally.
- After any change touching `src/services/serviceJob.ts`, `src/lib/service-job/**`, or the `service_jobs` migrations.
