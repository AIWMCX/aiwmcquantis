// Apply pending migrations via the Supabase Management API and record them
// in supabase_migrations.schema_migrations so `supabase db push` stays in sync.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-pending-migrations.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_REF = 'dmlxrvfyqsakyjomsvdj';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const LAST_APPLIED = '20260606014122';

if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1); }

async function runSql(query, label) {
  const resp = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`${label}: HTTP ${resp.status} ${text.slice(0, 500)}`);
  return text;
}

const dir = join(process.cwd(), 'supabase', 'migrations');
const pending = readdirSync(dir)
  .filter(f => f.endsWith('.sql') && !f.startsWith('seed_'))
  .filter(f => f.split('_')[0] > LAST_APPLIED)
  .sort();

console.log(`Pending migrations: ${pending.length}`);
const failed = [];
for (const file of pending) {
  const version = file.split('_')[0];
  const sql = readFileSync(join(dir, file), 'utf8');
  try {
    await runSql(sql, file);
    await runSql(
      `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${version}', '${file.replace(/'/g, "''")}') ON CONFLICT (version) DO NOTHING;`,
      `${file} record`,
    );
    console.log(`✓ ${file}`);
  } catch (e) {
    console.error(`✗ ${file}: ${e.message}`);
    failed.push(file);
  }
}
console.log(failed.length ? `\nFAILED: ${failed.join(', ')}` : '\nAll pending migrations applied.');
process.exit(failed.length ? 1 : 0);
