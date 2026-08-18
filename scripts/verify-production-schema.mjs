// Migration control-plane: schema-contract verifier.
//
// Checks live production schema against supabase/schema-contract/contract.json
// -- the CURRENT required-schema contract, not a replay of every historical
// migration. Exits non-zero if any non-deprecated P0/P1 object fails, which
// is what makes "DATABASE_MIGRATIONS = PASS" mean the schema the app actually
// needs is present, not just that `db push` returned exit 0.
//
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/verify-production-schema.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCheckQuery, evaluateContractResults } from './lib/schema-contract-lib.mjs';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'dmlxrvfyqsakyjomsvdj';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN not set — cannot verify production schema');
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

const contractPath = join(process.cwd(), 'supabase', 'schema-contract', 'contract.json');
const contract = JSON.parse(readFileSync(contractPath, 'utf8'));

const resultsByObject = new Map();
for (const entry of contract.objects) {
  if (entry.deprecated) continue;
  try {
    const rows = await runSql(buildCheckQuery(entry.check));
    resultsByObject.set(entry.object, Boolean(rows?.[0]?.ok));
  } catch (e) {
    console.error(`Query error for ${entry.object}: ${e.message}`);
    resultsByObject.set(entry.object, false);
  }
}

const { rows, passed, blockingFailures } = evaluateContractResults(contract.objects, resultsByObject);

console.log('SCHEMA CONTRACT VERIFICATION');
console.log('============================');
for (const r of rows) {
  const icon = r.status === 'PASS' ? '✓' : r.status === 'SKIPPED_DEPRECATED' ? '·' : '✗';
  console.log(`[${icon}] ${r.status.padEnd(18)} ${r.severity.padEnd(8)} ${r.object}`);
}

if (!passed) {
  console.error(`\n${blockingFailures.length} blocking failure(s) — release must not proceed.`);
  for (const f of blockingFailures) {
    console.error(`  FAIL [${f.severity}] ${f.object}`);
  }
  process.exit(1);
}

console.log('\nAll P0/P1 schema-contract objects verified present and correct.');
process.exit(0);
