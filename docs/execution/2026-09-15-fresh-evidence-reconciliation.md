# AIWMC Quantis — Fresh Evidence Reconciliation
First execution of Astra 6 Prompt 2. General reconciliation — no single
pending decision; scoped as "what changed since the 2026-09-12 baseline."

**Audit timestamp**: 2026-09-15, ~06:15 UTC
**Requested decision**: none specific — general state refresh
**Relevant date window**: 2026-09-12 (prior baseline) → 2026-09-15 (now)

## 1. One-sentence production verdict

Production is stable and deployed correctly; the one open financial-integrity
issue from the baseline has its root cause fixed and deployed, but the 5
already-flagged historical analysis rows are not yet retroactively resolved
and will keep showing in the daily sweep until explicitly handled.

## 2. Evidence table

| Domain | State | Proof | Timestamp | Implication |
|---|---|---|---|---|
| Repo `main` HEAD | LIVE-VERIFIED | `6ebe349`, `git log origin/main -1` | 2026-09-15 06:12 UTC | Matches what's deployed (see next row) |
| Latest Production Deploy | LIVE-VERIFIED | Run success for `874612b` (PR #145 merge) | 2026-09-14 17:27 UTC | The gross-margin fix (PR #145) is confirmed live — its exact source string (`effectiveCogsForMargins`) was grepped directly out of the deployed `analyze-business` bundle, not inferred from workflow status |
| Open PRs | LIVE-VERIFIED | `gh pr list --state open` | 2026-09-15 | Only PR #120 (draft since 2026-09-07, unrelated marketing-ops work) — no new WIP since yesterday |
| CI on latest commit | DEPLOYED-UNVERIFIED | Run triggered, conclusion not yet returned at audit time | 2026-09-15 06:12 UTC | Docs-only commit (this pack's save); low risk regardless of outcome |
| Financial invariant sweep | PARTIAL | Last run 2026-09-14 15:38 UTC, before the fix deployed (17:27 UTC) | 2026-09-14 15:38 UTC | Today's sweep (next scheduled run) is the first that could show the fix's effect on **new** analyses — but see reconciliation table below: the 5 existing flagged rows will NOT disappear on their own |
| RLS access drift | LIVE-VERIFIED | success | 2026-09-15 05:14 UTC | Clean |
| Stuck AI calls | LIVE-VERIFIED | success | 2026-09-15 01:39 UTC | Clean |
| P0 10-table regression | LIVE-VERIFIED | success | 2026-09-15 04:58 UTC | Clean |
| Security advisors | LIVE-VERIFIED | `get_advisors(type=security)`, 0 ERROR, 6 WARN categories, 1 INFO | 2026-09-15 06:20 UTC | 5 of 6 WARN categories are the same GraphQL-exposure/SECURITY-DEFINER-grant noise already reviewed and accepted this week as consistent with existing convention. **One is new to flag**: "Leaked Password Protection Disabled" (HaveIBeenPwned check) — a real, zero-cost, one-click fix not yet enabled |
| Stripe reconciliation cron | UNKNOWN | Not re-checked this run (checked 2026-09-14, showed one stuck `running` row from 2026-09-12, since self-recovered) | 2026-09-14 | Not re-verified today; low priority given `checked_count=0` (no real subscriptions to reconcile at present) |

## 3. Metric reconciliation

| Metric | Source | Inclusion rule | Exclusions | Distinct key | Window | Query time | 2026-09-12 value | 2026-09-15 value | Gap |
|---|---|---|---|---|---|---|---|---|---|
| Total analyses | `analyses` | All rows | None applied at this level (129 admin / 56 non-admin split not re-verified this run) | `id` | All-time | 06:10 UTC | 185 | 185 | Known: admin/non-admin split assumed unchanged, not re-split this run |
| Distinct analysis users | `analyses` | `count(distinct user_id)` | Includes internal/test identities | `user_id` | All-time | 06:10 UTC | 4 | 4 | None |
| Financial invariant violations | `financial_invariant_sweep_runs`, latest row | Rows flagged by the sweep's own logic | None — sweep already excludes malformed | `violation_ids` (uuid[]) | Latest run only | 06:16 UTC | 5 (as of last successful run) | 5 (same 5 IDs, unchanged — last run predates the fix) | **The fix does not retroactively close these 5** — see decision below |
| Paid engagements | `paid_engagements` | All rows | None | `id` | All-time | 06:10 UTC | 0 | 0 | None |
| Content Studio generations | `content_studio_generations` | All rows | None | `id` | All-time | 06:10 UTC | 33 | not re-queried this run (no new generation activity reported) | Low confidence — recommend re-query before any content-related decision |
| Merged PRs since baseline | GitHub | `state:merged`, `mergedAt > 2026-09-12` | None | PR number | 2026-09-12→2026-09-15 | 06:11 UTC | n/a | 5 (#141, #142, #143, #144, #145) | New evidence this window |

## 4. Conflicts with prior documents/memory

- The Astra 6 pack's own baseline (Section 1) states "sentinel payback values, break-even guard behavior" as an open divergence. This reconciliation confirms: **one specific instance of this class was found, root-caused, and fixed** (PR #145) — the `999` sentinel and `1%` margin floor themselves remain intentionally in place as legacy fallbacks with typed-state escape hatches, matching the pack's own addendum added yesterday. No new conflict — the addendum already covers this correctly.
- No other conflicts found between this reconciliation and the saved pack, the 2026-09-14 daily health check, or the 2026-09-12 dashboard-redesign plan.

## 5. Blockers requiring founder action

1. **Enable "Leaked Password Protection"** in Supabase Dashboard → Authentication → Policies (or Settings). Zero cost, one click, closes a real WARN-level advisory that's been sitting open (not previously surfaced in this session).
2. **Decide how to handle the 5 already-flagged historical analysis rows** (`financial_invariant_sweep_runs` latest `violation_ids`). Per the CTO mandate's own P0.3 options — no-op / label / recompute / quarantine — a decision is needed: their stored `gross_margin`/`operating_margin` numbers are mathematically inconsistent, and they'll keep appearing in the daily sweep forever unless explicitly resolved. **User classification confirmed this run**: all 5 belong to internal/founder-owned accounts — `jeltovbogdan@gmail.com` (founder's primary account), `beltovbogdan@gmail.com` (an alt/test variant of the same name — one-letter transposition), and `jjbalaganvasya@gmail.com` (a known `content_admin` internal account per existing code comments in `content-studio-generate/index.ts`). **Zero real customers were ever affected.** This lowers urgency considerably — recommend low-priority recompute-and-close (or explicit quarantine label) whenever convenient, not an emergency fix.

## 6. Current State Pack (JSON)

```json
{
  "audit_timestamp_utc": "2026-09-15T06:20:00Z",
  "repo_head_sha": "6ebe349dafabfd8d3077bd5d71724fb4895235ba",
  "production_deploy_sha": "874612b1ae372e651483f8c87cfb8d2aeed73cc1",
  "production_deploy_state": "READY_CONFIRMED_VIA_SOURCE_GREP",
  "open_prs": 1,
  "merged_prs_since_2026_09_12": 5,
  "financial_invariant_sweep": {
    "last_run_utc": "2026-09-14T15:38:43Z",
    "status": "completed",
    "scanned_count": 185,
    "violation_count": 5,
    "violation_category": "OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT",
    "root_cause_fixed": true,
    "fix_pr": 145,
    "fix_deployed_utc": "2026-09-14T17:27:52Z",
    "existing_violations_retroactively_resolved": false,
    "next_sweep_expected_to_show_new_violations": false,
    "all_5_violations_on_internal_founder_owned_accounts": true,
    "customer_impact": "none_confirmed",
    "note": "Fix prevents recurrence for new analyses; does not recompute existing flagged rows. All 5 flagged rows verified this run to belong to internal/founder accounts (jeltovbogdan@gmail.com, beltovbogdan@gmail.com, jjbalaganvasya@gmail.com) -- zero real customer impact."
  },
  "scheduled_monitors_today": {
    "rls_access_drift": "success",
    "stuck_ai_calls": "success",
    "p0_10table_regression": "success"
  },
  "security_advisors": {
    "error_count": 0,
    "warn_count": 6,
    "info_count": 1,
    "new_unaddressed_finding": "leaked_password_protection_disabled"
  },
  "aggregate_snapshot": {
    "analyses_total": 185,
    "paid_engagements": 0,
    "content_studio_generations_last_known": 33,
    "autoposter_posts_total": 72,
    "autoposter_active": 0
  },
  "unverified_this_run": [
    "content_studio_generations current count",
    "stripe_reconciliation_runs current status",
    "public production route copy (not re-crawled this run)"
  ]
}
```

## 7. The single decision this evidence changes most

**Whether to recompute the 5 historically-flagged analyses now, or leave them
quarantined-in-place.** Everything else checked is either stable (deploy,
monitors) or already-decided (the fix itself). This is the one open item
with a real choice attached, and it directly determines whether tomorrow's
sweep can finally report zero violations or will keep reporting 5 forever
under the current fixed-but-not-backfilled state.
