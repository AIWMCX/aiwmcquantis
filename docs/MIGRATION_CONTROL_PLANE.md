# Migration Control Plane — 2026-08-18

**Trigger:** while restoring three PR #41 migration-drift slices (referral,
lifecycle/retention), `apply_migration` (Supabase MCP) had to be manually
ledger-repaired twice after production application. That is the same class
of mechanism ("ledger says applied, schema reality differs") as the original
26-table incident, just observed live instead of reconstructed after the
fact. This document traces the mechanism, defines one canonical migration
authority, and adds an executable control plane so the failure mode becomes
structurally harder to reproduce.

## 1. Migration application paths (as they exist today)

| Path | Actor | Environment | Command/tool | Ledger version used | Transaction behavior | Production-allowed? | Status |
|---|---|---|---|---|---|---|---|
| CI auto-deploy | GitHub Actions (`run-migrations` job) | `production` environment | `npx supabase db push --password ... --include-all` | Filename-embedded version (canonical CLI behavior) | Whole-file transaction per Supabase CLI semantics | Yes — this is the intended, default path | **Active**, but its failure is a soft `::warning`, not a hard failure (see §2) |
| Supabase MCP `apply_migration` | Claude Code agent (this session) | `production` (direct, no git round-trip) | `mcp__...__apply_migration` | **Auto-generated timestamp at call time**, NOT the `name` parameter's embedded version | Single transaction per call (confirmed via dry-run `BEGIN...ROLLBACK` testing) | Used this session for emergency schema-recovery slices, with explicit per-mutation approval | **Root cause of both manual repairs this session** — see §2 |
| Supabase MCP `execute_sql` | Claude Code agent | `production` (direct) | `mcp__...__execute_sql` | Does not touch the ledger at all | Single transaction per call | Used for dry-runs, verification queries, and small emergency DDL (e.g. `20260622120001` email-engagement fix earlier this session) | Correctly used for read-only/diagnostic work; DDL applied this way is **never ledger-tracked** unless a separate `apply_migration`/manual `INSERT` follows |
| `scripts/apply-pending-migrations.mjs` | Local developer / agent, manually invoked | `production` (Management API, `SUPABASE_ACCESS_TOKEN`) | `node scripts/apply-pending-migrations.mjs` | **Filename-embedded version, correctly** (`file.split('_')[0]`) | One `runSql` call per migration file (not wrapped in an explicit transaction — relies on each file being a single statement or the API's own behavior) | Historical one-off (`LAST_APPLIED` hardcoded to `20260606014122`) | Present in repo but not part of the routine deploy path; the one script in the repo that gets the version right |
| `scripts/fix-failed-migrations.mjs` | Local developer / agent, manually invoked | `production` (Management API) | `node scripts/fix-failed-migrations.mjs` | Filename-embedded version, correctly | Ad hoc per-migration | One-off historical remediation | **Directly demonstrates the root-cause pattern**: several of its entries call `record(version, name)` — inserting a ledger row **without running the migration's DDL at all** — with comments like *"objects already exist in prod — mark applied"* and *"target tables absent... mark applied; policies will be recreated if/when tables are added"*. This is a human/agent judgment call to mark a migration applied despite its postconditions not holding, made as an accepted practice, not a tooling bug. |
| Manual ledger repair (this session) | Claude Code agent | `production` (`execute_sql` `UPDATE supabase_migrations.schema_migrations SET version = ...`) | Direct SQL | Manually rewritten to match the filename | N/A | Used twice this session (referral slice, lifecycle slice) to correct the MCP `apply_migration` version-mismatch | **This is itself a second class of divergence if not tracked** — see §2 point 5 |
| Dashboard SQL editor | Not observed in this session's investigation | — | — | — | — | Plausible historical path (cannot confirm without dashboard audit-log access, which the current MCP/CLI toolchain does not expose) | **UNVERIFIED** |

## 2. Version-mismatch mechanism

Observed twice this session: `apply_migration` was called with
`name: "20260817050000_restore_referral_conversions_and_rewards"`, and the
DDL was applied correctly, but `list_migrations` afterward showed the ledger
row registered under version `20260818030757` (a timestamp close to the call
time) rather than `20260817050000` (the filename's embedded version).

1. **Which tool generated the replacement version?** The Supabase MCP
   server's `apply_migration` implementation — not `supabase db push`, not
   Postgres, not this repo's code. The MCP tool schema takes a `name`
   parameter (a human-readable label) but does not accept a `version`
   parameter at all.
2. **Does `apply_migration` intentionally generate its own version?** Yes —
   this is its documented design: it mirrors `supabase migration new`'s
   auto-versioning behavior (stamp "now" as the version), because the MCP
   tool is built for the general case of "write and apply a brand-new
   migration in one step," not "apply an already-written, already-versioned
   repository file verbatim."
3. **Does the supplied `name` control the ledger version?** No. `name`
   only sets the `name` column; `version` is independently generated.
   This is exactly why `reconcileLedger()` (§7) matches on `name` to detect
   the mismatch — `name` is the only field this tool preserves faithfully.
4. **Does CI then see the original repo migration as pending?** Yes. `supabase
   db push` matches migrations by version, not content. A file whose version
   never appears in the ledger reads as "not yet applied" to the CLI, even
   though its DDL already ran. Left alone, the next `db push` would attempt
   to re-run it — harmless *only* because every migration this session wrote
   is idempotent (`IF NOT EXISTS` / `DROP POLICY IF EXISTS`) by established
   practice, not because the tooling guarantees it.
5. **Does manually repairing the ledger create a second divergence class?**
   Potentially, yes: `UPDATE ... SET version = '<correct>'` changes the
   ledger's version but does not touch its `name`, `statements`, or
   `idempotency_key` columns, which may still reflect the auto-generated
   call. This session's repairs only rewrote `version`, which is the field
   `supabase db push` actually keys on — but this is a manual, ad hoc fix
   applied under time pressure, not a systemic guarantee. §5 defines the
   exception workflow this should follow going forward instead.
6. **Is this workflow officially compatible with `supabase db push`?**
   Not officially documented as such. `db push` assumes the ledger's
   versions came from files that exist (or once existed) with matching
   version prefixes. Mixing MCP-applied (auto-versioned) and CLI-applied
   (filename-versioned) migrations against the same ledger works only
   because this session manually reconciled it after each MCP application.

**Classification: `UNSUPPORTED_MIXED_WORKFLOW`.** `apply_migration`'s
auto-versioning is expected behavior for its intended use case (writing a
new migration on the fly), not a bug — but using it to apply an
already-versioned repository file, then leaving the ledger in that state, is
an unsupported way to drive a ledger that `supabase db push` also manages.
It is not literally what caused the original 26-table/19-migration drift
(§1's `fix-failed-migrations.mjs` finding is the closer analog for that:
explicit "mark applied without running DDL" judgment calls, likely made
similarly for earlier migrations no copy of which survives in this repo)
but it is the same *shape* of problem: a path that can register
`ledger = APPLIED` while `schema` diverges from what the ledger's version
implies.

## 3. Canonical migration authority

**The repository migration filename/version is the single canonical
production migration identifier**, per the non-negotiable invariant. Going
forward:

- **Routine path:** write the migration file in git → CI's `run-migrations`
  job applies it via `supabase db push` → the ledger records the filename's
  own version → `verify-schema-contract` (§6-§8) confirms live schema
  matches the current contract.
- **Supabase MCP `apply_migration`:** downgraded to **diagnostics and
  dry-runs only** (its `BEGIN...ROLLBACK`-wrapped use earlier this session,
  and structural verification via `execute_sql`, remain the correct use).
  It is no longer the routine production migration executor, because it
  cannot preserve the repository version — exactly the "no documented safe
  mapping exists" condition in the governing prompt that requires falling
  back to read-only use.
- **`execute_sql` DDL:** only for the documented emergency-hotfix exception
  (§4) — never as a substitute for a committed, versioned migration file.

## 4. Emergency hotfix protocol

For the rare case production needs a schema fix before a PR can merge:

1. Write the migration file in `supabase/migrations/` first, with its real
   intended version as the filename prefix. Do not skip this step "to save
   time" — the file is the source of truth, not the production database.
2. Freeze that exact version — do not let `apply_migration` or any other
   tool substitute its own.
3. Dry-run the SQL in a rolled-back transaction (`BEGIN; ...; ROLLBACK;` via
   `execute_sql`) against production. Confirm postconditions inside the
   transaction, then confirm they revert after `ROLLBACK`.
4. Get explicit production-change approval (this session's established
   `AskUserQuestion` gate).
5. Apply the exact migration content via `execute_sql`, then **immediately**
   register it in the ledger yourself with the file's real version:
   `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('<filename-version>', '<filename-without-.sql>') ON CONFLICT (version) DO NOTHING;`
   — this is the one workflow in §1 that gets the version right
   (`scripts/apply-pending-migrations.mjs`'s pattern), generalized to a
   single-migration manual step.
6. Verify postconditions live (the real, non-rolled-back state).
7. Commit the migration file, push, open a PR referencing the emergency
   application, let CI's `verify-migration-ledger` step confirm
   `APPLIED_AND_PRESENT` (not `PENDING`, since it's already live) once
   merged to main.
8. `run-migrations`' subsequent `db push` sees the version already present
   and is a no-op for this file, by design.

## 5. Historical manual ledger repairs (this session)

| Migration | Repo version | Initial ledger version (as registered by `apply_migration`) | Reason | Repair performed | Current verified state |
|---|---|---|---|---|---|
| `20260817050000_restore_referral_conversions_and_rewards.sql` | `20260817050000` | `20260818030757` | `apply_migration` auto-generated a call-time timestamp instead of using the file's embedded version | `UPDATE supabase_migrations.schema_migrations SET version = '20260817050000' WHERE version = '20260818030757';` | Verified: `list_migrations` shows exactly one row, `version = 20260817050000`, `name = 20260817050000_restore_referral_conversions_and_rewards`. No duplicate row. `HISTORICAL_REPAIR_VERIFIED`. |
| `20260818040000_restore_engagement_notifications_lifecycle_email.sql` | `20260818040000` | `20260818032917` | Same mechanism, same tool call | `UPDATE supabase_migrations.schema_migrations SET version = '20260818040000' WHERE version = '20260818032917';` | Verified: `list_migrations` shows exactly one row, `version = 20260818040000`, matching name. No duplicate row. `HISTORICAL_REPAIR_VERIFIED`. |

Both repairs are internally consistent: in each case exactly one ledger row
existed for the migration (no orphan duplicate under the wrong version was
left behind).

## 6. Live drift found while validating the control plane against real data

Running the newly-built `reconcileLedger()` against the actual repository
and the actual production ledger (§7) surfaced four more real, pre-existing
gaps beyond the two repairs above — proof the tooling works, and proof this
class of drift was still ongoing:

1. **A third instance of the version-mismatch bug**, self-inflicted while
   fixing the first two: registering the new `gsc_verification_repair`
   migration via `apply_migration` produced *two* phantom-version ledger
   rows for the same `name` (one from an initial `apply_migration` call,
   one from a retry). Both deleted; replaced with one correct row.
2. **A genuine `LEDGER_ONLY` row**: `gsc_verification_repair`, applied
   directly via `execute_sql` earlier in this session (before the control
   plane existed) during the CI-migration-pipeline repair work, was never
   committed as a migration file at all. Closed by writing
   `supabase/migrations/20260818050000_gsc_verification_repair.sql` to match
   the table's actual live shape, and — because the fix's *conceptual* date
   (`20260514200426`) collided with an unrelated, already-applied migration
   at that exact version — versioning it today's date instead, per the
   "production converges forward" principle (§13 of the governing prompt).
3. **Two genuine `GIT_ONLY` rows** (migrations whose version is older than
   the ledger's high-water mark, i.e. migrations after them were applied
   while they were not — the PR #41 silent-skip shape, found live):
   - `20260706170000_analyses_total_counter.sql` — postconditions verified
     fully live (`public_metrics` has a live-updating `analyses_total` row,
     the bump function references it). Registered in the ledger directly;
     no DDL re-run needed.
   - `20260704003227_46b9ef05-....sql` — partially live: its
     `team_members`/`team_invitations` role CHECK constraints existed, but
     its `gsc_admin_delete` policy did not (confirmed missing via
     `pg_policies` before concluding this). The missing piece was folded
     into the new `gsc_verification_repair` migration (§2 above); once
     applied, this migration's full postcondition set held, and it was
     registered in the ledger directly rather than re-run (its own
     `CREATE POLICY "gsc_admin_delete"` has no `IF NOT EXISTS` guard and
     would have errored against the now-already-created policy).
4. **One correctly-intentional non-application**:
   `20260704130000_analyses_bump_plans_metric.sql` self-documents
   "SUPERSEDED — DO NOT APPLY" in its own header (superseded by #3's first
   bullet before it ever shipped). Added to the new
   `supabase/migrations/.ledger-ignore` allowlist (mirrors
   `supabase/functions/.deploy-ignore`) rather than left to trip the
   reconciler on every future run.

After all four: `scripts/verify-migration-ledger.mjs` run against the real,
current production ledger and the real, current repository reports
`APPLIED_AND_PRESENT: 216, PENDING: 0, VERSION_MISMATCH: 0, GIT_ONLY: 0,
LEDGER_ONLY: 0` — genuinely clean, not a fixture result.

## 7. Schema contract

`supabase/schema-contract/contract.json` — the current required-schema
contract. Lists only objects **current canonical application code**
depends on, explicitly excluding historical/superseded architecture
(`doc_generation_jobs`/`report_outputs` are listed with `"deprecated": true`
specifically so the verifier does not flag their absence as drift). Each
entry: `object`, `domain`, `required_by`, `severity` (`P0`/`P1`/`P2`/`OPTIONAL`),
`check` (a typed, machine-executable verification — table existence, RLS
enabled, table/function privilege, function existence, trigger existence).

## 8. Control-plane implementation

- `scripts/lib/schema-contract-lib.mjs` — pure logic, no I/O: `buildCheckQuery()`
  (contract check → SQL), `evaluateContractResults()` (contract + query
  results → pass/fail), `reconcileLedger()` (repo migrations + ledger rows →
  per-entry classification: `APPLIED_AND_PRESENT` / `PENDING` /
  `VERSION_MISMATCH` / `GIT_ONLY` / `LEDGER_ONLY`).
- `scripts/verify-production-schema.mjs` — runs every non-deprecated
  contract check against live production (Management API,
  `SUPABASE_ACCESS_TOKEN`), exits non-zero on any P0/P1 failure.
- `scripts/verify-migration-ledger.mjs` — compares `supabase/migrations/*.sql`
  against the live ledger, exits non-zero on any `VERSION_MISMATCH` /
  `GIT_ONLY` / `LEDGER_ONLY`. Read-only; never mutates the ledger.
- `src/__tests__/migration-control-plane.test.ts` — 13 fixture-based tests
  (no live DB, no customer data) covering the happy path, the exact
  MCP-generated-version incident, the PR #41 silent-skip shape, an orphan
  ledger row, a deprecated-table false-positive guard, missing-P0-table
  drift, a forbidden grant, and disabled RLS. All passing.

`GIT_ONLY`/`PENDING` distinction: a repo migration with no ledger match is
`PENDING` (normal — about to be applied this run) if its version is newer
than every version already in the ledger, or `GIT_ONLY` (anomalous — this is
the PR #41 silent-skip shape) if migrations *after* it were already applied
while it was not.

## 9. CI gate

`.github/workflows/production-deploy.yml` — new `verify-schema-contract`
job, `needs: [run-migrations]`, runs after migrations regardless of the
soft-warning `db push` outcome. Two steps: reconcile the ledger, then verify
the schema contract. **This job is the authoritative
`DATABASE_MIGRATIONS = PASS/FAIL` signal** — unlike the existing `db push`
step (intentionally tolerant, `::warning` only, so a transient CLI hiccup
never blocks the whole release), this job hard-fails the workflow on real
drift. It deliberately does not gate `deploy-edge-functions` (kept decoupled
for the same reason `deploy-edge-functions` already uses `always()`: a
schema issue must never freeze an unrelated code fix from shipping) — but a
red `verify-schema-contract` check is now a visible, first-class release
signal instead of a manual repair discovered days later.

## 10. Not done in this pass

- Per-migration domain/severity tagging for all ~230 historical migration
  files (the manifest in §14 of the governing prompt) was not hand-built —
  at this repo's size that would mean writing ~230 manual entries with no
  automated way to verify their accuracy. Instead, `verify-migration-ledger.mjs`
  blocks release on **any** `VERSION_MISMATCH`/`GIT_ONLY`/`LEDGER_ONLY`,
  not just ones a manifest tags P0/P1 — a safe-by-default simplification
  documented here rather than silently narrowed.
- Dashboard SQL editor as a migration path remains `UNVERIFIED` — the
  current MCP/CLI toolchain does not expose Supabase Dashboard audit logs.
- The schema contract (§7) currently covers the objects touched by this
  session's incidents plus a handful of always-critical core tables
  (`analyses`, `profiles`, `subscriptions`). It is not (and does not claim
  to be) an exhaustive contract for all 90 live tables — expanding it
  remains open work, tracked alongside the remaining PR #41 dispositions.
- Running the real reconciler against real data (§6) found 4 more drift
  instances beyond PR #41's original 26 tables, purely from this one
  migration window (2026-07-04 through 2026-08-18). This strongly suggests
  more remain in the earlier, larger window PR #41 covered — the schema
  contract in §7 does not yet check most of those 26 tables' finer-grained
  objects (columns/functions/triggers/grants, not just table existence).
  Expanding §7's coverage is the highest-leverage next step for this
  control plane, ahead of resuming table-by-table PR #41 recovery.
