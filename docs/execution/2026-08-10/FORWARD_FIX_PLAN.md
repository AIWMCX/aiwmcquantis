# Forward Fix Plan — E5.5

Every item here is a **proposal**, not applied. Nothing in this document has been executed. Each fix is written as a new, forward-only, timestamped migration — never a further edit to a historical file — per the master prompt's own rule ("never silently rewrite production history"). None are created as actual files yet; they're specified here so implementation is a small, reviewable diff once you authorize proceeding, rather than more investigation.

Ordered by the priority established in `MIGRATION_LINEAGE_AUDIT.md` Section 3.

## 1. `is_service_role()` re-fix (contingent on `PRODUCTION_SCHEMA_DIFF.md` Priority-1 query #1 confirming the exploit is live)

```sql
-- 20260811000000_forward_fix_is_service_role.sql
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role',
    false
  )
$$;
```
Identical body to what's already on `feature/evidence-service`'s edited historical file — the fix itself was already correctly written; it just may never have reached production. This is a `CREATE OR REPLACE`, so it's safe to apply even if production's current body already matches (idempotent).

**Do not wait for the rest of this gate.** If the schema diff confirms this is live-exploitable, this should be proposed to you as a standalone emergency fix the moment that's confirmed, not bundled into the Evidence Service merge.

## 2. `subscriptions` migration re-application (contingent on diff query #2)

If the unique constraint and `admin_fix_subscription` are confirmed missing, re-run `20260608000002`'s original two steps (constraint + RPC) as a new forward migration, with the `RAISE NOTICE` correctly wrapped in a `DO` block from the start (no syntax error this time). Exact SQL to be pulled from the original file once confirmed necessary — not duplicated here to avoid drafting a fix for a problem not yet confirmed to exist.

## 3. Scenario ledger tables (contingent on diff query #3 — presumptively needed per current evidence)

**This one needs your explicit review before it's even drafted as a migration**, because the safe path renames a live production table (`scenarios` → `scenarios_legacy_monte_carlo`) to make room for the ledger design. Proposed shape, matching what's already on the feature branch:

```sql
-- 20260811010000_forward_fix_scenario_ledger.sql (DRAFT -- do not apply without founder sign-off)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scenarios' AND column_name = 'params'
  ) THEN
    ALTER TABLE public.scenarios RENAME TO scenarios_legacy_monte_carlo;
  END IF;
END $$;

-- then the ledger-design CREATE TABLE for scenarios, scenario_sets,
-- scenario_versions, scenario_runs, exactly as already written in
-- 20260730084255_scenario_framework_foundation.sql on feature/evidence-service.
```

Before drafting this further: **data-impact assessment**. If any customer has real rows in the legacy `scenarios` table, renaming it doesn't lose data, but every Scenario Workspace read/write path currently assumes the LEDGER shape (`scenario_set_id`, `version_number`) — meaning customers who believe they have saved scenarios today may find the UI shows nothing post-fix, because their data lives in the renamed legacy table under an incompatible shape. This needs a product decision (migrate legacy rows forward into the new shape? Show them read-only? Communicate a data reset?) that is not mine to make.

## 4. `benchmark_master_geo` seed re-application (contingent on diff query #4)

If confirmed empty, re-run the corrected 11-row INSERT (with `sector_level1 = 'ALL'`) as a new forward migration — trivial, no data-impact concerns (pure seed data, `ON CONFLICT DO NOTHING` already present in the source statement).

## 5. Reconstructed tables (`analysis_run_logs`, `rvce_cache`, `analysis_self_learning`, `quantis_learning_config`, `analysis_attempts`)

No forward-fix action anticipated for four of these five — `IF NOT EXISTS` already makes the historical edits safe no-ops against production if the tables exist there (expected). Action is **documentation, not migration**: once `PRODUCTION_SCHEMA_DIFF.md` Priority-2 queries return real column lists, update each reconstruction to exactly match production's real DDL (not just what `types.ts` surfaced), so a genuine disaster-recovery rebuild from this migration chain would produce byte-faithful schemas, not approximations.

`analysis_attempts` (finding #14) needs one additional step regardless of what the diff shows: either restore the cited `docs/security/2026-08-03-p0-access/01_RAW_POLICY_EVIDENCE.sql` file (if the original live query genuinely happened and just wasn't committed), or replace the migration's citation with an honest statement that the evidence file doesn't exist in this repository.

## 6. `qoc_audit` — recommend retirement review, not a forward fix

Finding #11's own evidence (the real write path is `qoc_audit_envelopes`, not `qoc_audit`) suggests this table and its associated migrations (`20260624010000`, `20260624054320`) may be entirely dead schema from an abandoned design iteration. Recommend a **separate, small investigation** (not a forward-fix migration) to confirm `qoc_audit` has zero real readers/writers in current code, and if so, propose formal retirement (a documented decision, possibly a future `DROP TABLE` migration) rather than continuing to carry ambiguous guard logic for a table nothing uses.

## Sequencing

Items 1 and 2 are cheap, safe, `CREATE OR REPLACE`/idempotent-constraint fixes — low risk, can move fast once confirmed necessary. Item 3 is the one genuinely risky, product-impacting change in this whole set and should not be rushed regardless of technical readiness. Item 4 is trivial. Item 5 is documentation-only. Item 6 is a separate, smaller thread.

None of these six items should be bundled into the Evidence Service merge itself — they're pre-existing production concerns this reconciliation surfaced, independent of Evidence Service, and mixing them into one PR would make the Evidence Service change harder to review and this fix harder to track to closure.
