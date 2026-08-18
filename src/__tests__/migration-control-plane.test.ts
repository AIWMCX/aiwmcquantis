// Migration control plane tests. Pure fixture-based -- no live database, no
// customer data, no network. Exercises the exact classification logic used
// by scripts/verify-production-schema.mjs and scripts/verify-migration-ledger.mjs
// via scripts/lib/schema-contract-lib.mjs. Each test reproduces one real or
// hypothetical incident from the PR #41 migration-ledger-drift investigation.
import { describe, it, expect } from 'vitest';
import {
  reconcileLedger,
  reconciliationBlocksRelease,
  evaluateContractResults,
  buildCheckQuery,
} from '../../scripts/lib/schema-contract-lib.mjs';

describe('migration control plane — ledger reconciliation', () => {
  it('Test A — happy path: repo migration exists, ledger has the same version', () => {
    const repo = [{ version: '20260817050000', filename: '20260817050000_restore_referral.sql' }];
    const ledger = [{ version: '20260817050000', name: '20260817050000_restore_referral' }];
    const results = reconcileLedger(repo, ledger);
    expect(results).toHaveLength(1);
    expect(results[0].classification).toBe('APPLIED_AND_PRESENT');
    expect(reconciliationBlocksRelease(results)).toBe(false);
  });

  it('Test C — MCP-style generated-version mismatch: same migration, different ledger version', () => {
    // Reproduces the exact incident hit twice this session: apply_migration
    // registers today's-date as the version, not the filename's version.
    const repo = [{ version: '20260817050000', filename: '20260817050000_restore_referral_conversions_and_rewards.sql' }];
    const ledger = [{ version: '20260818030757', name: '20260817050000_restore_referral_conversions_and_rewards' }];
    const results = reconcileLedger(repo, ledger);
    expect(results).toHaveLength(1);
    expect(results[0].classification).toBe('VERSION_MISMATCH');
    expect(results[0].ledgerVersion).toBe('20260818030757');
    // Must NOT silently infer equivalence — the mismatch blocks release.
    expect(reconciliationBlocksRelease(results)).toBe(true);
  });

  it('classifies a brand-new migration (newer than the ledger high-water mark) as PENDING, not GIT_ONLY', () => {
    const repo = [
      { version: '20260101000000', filename: '20260101000000_old.sql' },
      { version: '20260901000000', filename: '20260901000000_brand_new.sql' },
    ];
    const ledger = [{ version: '20260101000000', name: '20260101000000_old' }];
    const results = reconcileLedger(repo, ledger);
    const brandNew = results.find((r) => r.version === '20260901000000');
    expect(brandNew?.classification).toBe('PENDING');
    // PENDING alone (a migration about to be applied this CI run) must not block.
    expect(reconciliationBlocksRelease(results)).toBe(false);
  });

  it('reproduces PR #41: a migration older than the ledger high-water mark that was silently skipped is GIT_ONLY', () => {
    // This is the exact shape of the 19-migration/26-table drift: migrations
    // both before and after a given file are marked applied, but that one
    // file's effects never actually ran (whole-transaction rollback theory).
    const repo = [
      { version: '20260206003245', filename: '20260206003245_before.sql' },
      { version: '20260206003246', filename: '20260206003246_referral_never_ran.sql' },
      { version: '20260207000000', filename: '20260207000000_after.sql' },
    ];
    const ledger = [
      { version: '20260206003245', name: '20260206003245_before' },
      { version: '20260207000000', name: '20260207000000_after' },
    ];
    const results = reconcileLedger(repo, ledger);
    const skipped = results.find((r) => r.version === '20260206003246');
    expect(skipped?.classification).toBe('GIT_ONLY');
    expect(reconciliationBlocksRelease(results)).toBe(true);
  });

  it('flags an orphan ledger row (no matching repo file at all) as LEDGER_ONLY', () => {
    const repo = [{ version: '20260101000000', filename: '20260101000000_a.sql' }];
    const ledger = [
      { version: '20260101000000', name: '20260101000000_a' },
      { version: '20260215000000', name: 'some_adhoc_sql_never_committed' },
    ];
    const results = reconcileLedger(repo, ledger);
    const orphan = results.find((r) => r.classification === 'LEDGER_ONLY');
    expect(orphan?.version).toBe('20260215000000');
    expect(reconciliationBlocksRelease(results)).toBe(true);
  });
});

describe('migration control plane — schema contract evaluation', () => {
  it('Test B — ledger lies: ledger says applied, required P0 table is missing → FAIL / SCHEMA_DRIFT', () => {
    const objects = [
      { object: 'public.email_sequence_log', severity: 'P0', check: { kind: 'table_exists', table: 'email_sequence_log' } },
    ];
    const results = new Map([['public.email_sequence_log', false]]);
    const { passed, blockingFailures } = evaluateContractResults(objects, results);
    expect(passed).toBe(false);
    expect(blockingFailures).toHaveLength(1);
    expect(blockingFailures[0].object).toBe('public.email_sequence_log');
  });

  it('Test D — dead historical table marked deprecated in the contract → PASS, not resurrected', () => {
    const objects = [
      { object: 'public.doc_generation_jobs', severity: 'OPTIONAL', deprecated: true, check: { kind: 'table_exists', table: 'doc_generation_jobs' } },
    ];
    // Note: no result supplied at all for this object — the verifier script
    // skips deprecated objects entirely and never even queries them.
    const { passed, rows } = evaluateContractResults(objects, new Map());
    expect(passed).toBe(true);
    expect(rows[0].status).toBe('SKIPPED_DEPRECATED');
  });

  it('Test E — wrong RPC/table grant: anon has a privilege the contract forbids → FAIL', () => {
    const objects = [
      {
        object: 'public.user_notifications.anon_denied',
        severity: 'P0',
        check: { kind: 'no_table_privilege', table: 'user_notifications', role: 'anon', privilege: 'SELECT' },
      },
    ];
    // Live query would return ok=false because anon DOES have SELECT (the drift condition).
    const results = new Map([['public.user_notifications.anon_denied', false]]);
    const { passed, blockingFailures } = evaluateContractResults(objects, results);
    expect(passed).toBe(false);
    expect(blockingFailures[0].object).toBe('public.user_notifications.anon_denied');
  });

  it('Test F — RLS missing: table exists but RLS is disabled → FAIL', () => {
    const objects = [
      { object: 'public.user_engagement.rls_enabled', severity: 'P1', check: { kind: 'rls_enabled', table: 'user_engagement' } },
    ];
    const results = new Map([['public.user_engagement.rls_enabled', false]]);
    const { passed, blockingFailures } = evaluateContractResults(objects, results);
    expect(passed).toBe(false);
    expect(blockingFailures[0].object).toBe('public.user_engagement.rls_enabled');
  });

  it('P2/OPTIONAL non-deprecated failures do not block release', () => {
    const objects = [
      { object: 'public.some_nice_to_have', severity: 'P2', check: { kind: 'table_exists', table: 'some_nice_to_have' } },
    ];
    const results = new Map([['public.some_nice_to_have', false]]);
    const { passed, blockingFailures } = evaluateContractResults(objects, results);
    expect(passed).toBe(true);
    expect(blockingFailures).toHaveLength(0);
  });
});

describe('migration control plane — query builder', () => {
  it('builds a table_exists query using to_regclass, not a bare SELECT that could throw', () => {
    const sql = buildCheckQuery({ kind: 'table_exists', table: 'referral_rewards' });
    expect(sql).toContain("to_regclass('public.referral_rewards')");
  });

  it('builds a no_table_privilege query with the exact role and privilege', () => {
    const sql = buildCheckQuery({ kind: 'no_table_privilege', table: 'email_sequence_log', role: 'anon', privilege: 'SELECT' });
    expect(sql).toContain("has_table_privilege('anon', 'public.email_sequence_log', 'SELECT')");
    expect(sql.trim().startsWith('SELECT NOT')).toBe(true);
  });

  it('rejects an unknown check kind rather than silently no-op-ing', () => {
    expect(() => buildCheckQuery({ kind: 'made_up_kind' })).toThrow(/Unknown check kind/);
  });
});
