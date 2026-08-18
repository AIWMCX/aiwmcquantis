// Pure logic for the migration control plane: schema-contract evaluation and
// git-vs-ledger reconciliation. No network/DB access here on purpose -- this
// module is imported both by the live verifier scripts (which supply real
// query results) and by the Vitest fixture tests (which supply fake ones),
// so the classification logic itself is covered without touching production.

/**
 * Build the SQL query that answers one contract object's `check`.
 * Every query returns exactly one row with a single boolean column `ok`.
 */
export function buildCheckQuery(check) {
  switch (check.kind) {
    case 'table_exists':
      return `SELECT (to_regclass('public.${check.table}') IS NOT NULL) AS ok;`;
    case 'rls_enabled':
      return `SELECT COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.${check.table}')), false) AS ok;`;
    case 'no_table_privilege':
      return `SELECT NOT has_table_privilege('${check.role}', 'public.${check.table}', '${check.privilege}') AS ok;`;
    case 'has_table_privilege':
      return `SELECT has_table_privilege('${check.role}', 'public.${check.table}', '${check.privilege}') AS ok;`;
    case 'function_exists':
      return `SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = '${check.name}' AND p.pronargs = ${check.arg_count}
      ) AS ok;`;
    case 'trigger_exists':
      return `SELECT EXISTS (
        SELECT 1 FROM pg_trigger t
        WHERE t.tgname = '${check.trigger}' AND t.tgrelid = to_regclass('public.${check.table}') AND NOT t.tgisinternal
      ) AS ok;`;
    default:
      throw new Error(`Unknown check kind: ${check.kind}`);
  }
}

/**
 * Given the contract's object list and a Map<objectName, boolean> of query
 * results, decide overall pass/fail. Pure -- no I/O. This is what the tests
 * exercise directly with fixture result maps.
 */
export function evaluateContractResults(objects, resultsByObject) {
  const rows = objects.map((entry) => {
    if (entry.deprecated) {
      // Deprecated objects are never checked -- their absence is expected
      // and must not fail the release (Test D: dead historical table).
      return { object: entry.object, severity: entry.severity, status: 'SKIPPED_DEPRECATED', blocking: false };
    }
    const ok = resultsByObject.get(entry.object);
    if (ok === undefined) {
      return { object: entry.object, severity: entry.severity, status: 'UNVERIFIED', blocking: entry.severity === 'P0' || entry.severity === 'P1' };
    }
    const status = ok ? 'PASS' : 'FAIL';
    const blocking = !ok && (entry.severity === 'P0' || entry.severity === 'P1');
    return { object: entry.object, severity: entry.severity, status, blocking };
  });

  const blockingFailures = rows.filter((r) => r.blocking);
  return {
    rows,
    passed: blockingFailures.length === 0,
    blockingFailures,
  };
}

/**
 * Reconcile repository migration files against the Supabase migration
 * ledger. Pure -- takes plain data in, returns a classification per entry.
 *
 * repoMigrations: [{ version: string, filename: string }]
 * ledgerRows:     [{ version: string, name: string }]
 *
 * Classifications:
 *   APPLIED_AND_PRESENT — repo version found verbatim in the ledger.
 *   VERSION_MISMATCH    — no ledger row for this version, but a ledger row's
 *                         `name` matches this file (the MCP apply_migration
 *                         auto-generated-version bug: ledger.version is
 *                         today's timestamp, not the filename's version).
 *   PENDING             — no match at all, and this version is newer than
 *                         every version already in the ledger (normal:
 *                         about to be applied by this CI run).
 *   GIT_ONLY            — no match at all, but this version is OLDER than
 *                         the ledger's high-water mark -- i.e. migrations
 *                         after it were applied but it was not. Anomalous:
 *                         this is the exact silent-skip signature PR #41
 *                         found across 19 migrations / 26 tables.
 *   LEDGER_ONLY         — a ledger row whose version AND name match no
 *                         repository migration file at all (orphan ledger
 *                         entry -- applied via ad hoc SQL, or the file was
 *                         later deleted from git).
 */
export function reconcileLedger(repoMigrations, ledgerRows, ignoredFilenames = new Set()) {
  const ledgerByVersion = new Map(ledgerRows.map((r) => [r.version, r]));
  const ledgerByName = new Map(ledgerRows.map((r) => [r.name, r]));
  const maxLedgerVersion = ledgerRows.reduce((max, r) => (r.version > max ? r.version : max), '');

  const results = [];

  for (const m of repoMigrations) {
    if (ignoredFilenames.has(m.filename)) {
      // Explicitly marked "never applied, intentionally" (e.g. a migration
      // superseded by a later one before it ever shipped, self-documented
      // in the file header). Mirrors supabase/functions/.deploy-ignore.
      results.push({ version: m.version, filename: m.filename, classification: 'INTENTIONALLY_NOT_APPLIED', ledgerVersion: null });
      continue;
    }
    const baseName = m.filename.replace(/\.sql$/, '');
    const exact = ledgerByVersion.get(m.version);
    if (exact) {
      results.push({ version: m.version, filename: m.filename, classification: 'APPLIED_AND_PRESENT', ledgerVersion: exact.version });
      continue;
    }

    const nameMatch = ledgerByName.get(baseName) || ledgerByName.get(m.filename);
    if (nameMatch) {
      results.push({ version: m.version, filename: m.filename, classification: 'VERSION_MISMATCH', ledgerVersion: nameMatch.version });
      continue;
    }

    if (m.version > maxLedgerVersion) {
      results.push({ version: m.version, filename: m.filename, classification: 'PENDING', ledgerVersion: null });
    } else {
      results.push({ version: m.version, filename: m.filename, classification: 'GIT_ONLY', ledgerVersion: null });
    }
  }

  const repoVersions = new Set(repoMigrations.map((m) => m.version));
  const repoNames = new Set(repoMigrations.map((m) => m.filename.replace(/\.sql$/, '')));
  for (const row of ledgerRows) {
    if (!repoVersions.has(row.version) && !repoNames.has(row.name)) {
      results.push({ version: row.version, filename: row.name, classification: 'LEDGER_ONLY', ledgerVersion: row.version });
    }
  }

  return results;
}

/** Blocking classes per the control-plane invariant: never let these pass silently. */
export const BLOCKING_LEDGER_CLASSES = new Set(['VERSION_MISMATCH', 'GIT_ONLY', 'LEDGER_ONLY']);

export function reconciliationBlocksRelease(reconciliationResults) {
  return reconciliationResults.some((r) => BLOCKING_LEDGER_CLASSES.has(r.classification));
}
