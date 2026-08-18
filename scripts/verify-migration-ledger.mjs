// Migration control-plane: git-vs-ledger reconciliation verifier.
//
// Compares supabase/migrations/*.sql against supabase_migrations.schema_migrations
// in production. Never mutates the ledger -- read-only, always. Classifies
// every repo migration and every ledger row (see reconcileLedger() in
// scripts/lib/schema-contract-lib.mjs for the exact classification rules),
// and blocks release on VERSION_MISMATCH / GIT_ONLY / LEDGER_ONLY -- the
// three states that mean "the ledger's story does not match git reality",
// which is the precondition for the "ledger=APPLIED, schema=MISSING,
// deployment=GREEN" failure mode this whole control plane exists to prevent.
//
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/verify-migration-ledger.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { reconcileLedger, reconciliationBlocksRelease, BLOCKING_LEDGER_CLASSES } from './lib/schema-contract-lib.mjs';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'dmlxrvfyqsakyjomsvdj';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN not set — cannot verify migration ledger');
  process.exit(1);
}

async function runSql(query) {
  const resp = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const repoMigrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .map((filename) => ({ version: filename.split('_')[0], filename }))
  .filter((m) => /^\d+$/.test(m.version))
  .sort((a, b) => a.version.localeCompare(b.version));

const ledgerRows = await runSql(
  'SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;'
);

const ignoreFile = join(migrationsDir, '.ledger-ignore');
const ignoredFilenames = new Set(
  existsSync(ignoreFile)
    ? readFileSync(ignoreFile, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
    : []
);

const results = reconcileLedger(repoMigrations, ledgerRows, ignoredFilenames);
const byClass = {};
for (const r of results) {
  (byClass[r.classification] ??= []).push(r);
}

console.log('MIGRATION LEDGER RECONCILIATION');
console.log('================================');
for (const cls of ['APPLIED_AND_PRESENT', 'PENDING', 'INTENTIONALLY_NOT_APPLIED', 'VERSION_MISMATCH', 'GIT_ONLY', 'LEDGER_ONLY']) {
  const rows = byClass[cls] || [];
  console.log(`${cls}: ${rows.length}`);
  if (BLOCKING_LEDGER_CLASSES.has(cls)) {
    for (const r of rows) {
      console.log(`  ⚠ ${r.filename} (repo=${r.version}, ledger=${r.ledgerVersion ?? 'absent'})`);
    }
  }
}

if (reconciliationBlocksRelease(results)) {
  console.error('\nBLOCKING: ledger/repo mismatch detected — investigate before release.');
  console.error('This is exactly the "ledger says applied, schema reality differs" class of drift (PR #41).');
  process.exit(1);
}

console.log('\nGit and ledger are consistent.');
process.exit(0);
