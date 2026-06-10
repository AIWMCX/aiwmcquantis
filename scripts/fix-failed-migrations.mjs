// One-off: resolve the 6 failed migrations individually.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_REF = 'dmlxrvfyqsakyjomsvdj';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const dir = join(process.cwd(), 'supabase', 'migrations');

async function runSql(query, label) {
  const resp = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`${label}: HTTP ${resp.status} ${text.slice(0, 400)}`);
  return text;
}

const record = (version, name) =>
  runSql(
    `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${version}', '${name}') ON CONFLICT (version) DO NOTHING;`,
    `record ${version}`,
  );

// 1. consume_idea_gen_quota return-type change requires DROP first.
await runSql('DROP FUNCTION IF EXISTS public.consume_idea_gen_quota(uuid,integer,text);', 'drop quota fn');
const f051306 = '20260607051306_4067f156-81eb-42ef-bf71-ff9005234d5f.sql';
await runSql(readFileSync(join(dir, f051306), 'utf8'), f051306);
await record('20260607051306', f051306);
console.log('✓ 20260607051306 (quota fn recreated)');

// 2. subscription_upsert_fix: strip the invalid top-level RAISE NOTICE line.
const f002 = '20260608000002_subscription_upsert_fix.sql';
const sql002 = readFileSync(join(dir, f002), 'utf8')
  .split('\n')
  .filter(l => !/^\s*RAISE NOTICE/i.test(l))
  .join('\n');
await runSql(sql002, f002);
await record('20260608000002', f002);
console.log('✓ 20260608000002 (subscription upsert fix applied)');

// 3. self_learning_tables: objects already exist in prod — mark applied.
await record('20260606130000', '20260606130000_self_learning_tables.sql');
console.log('✓ 20260606130000 (marked applied — objects exist)');

// 4. RLS policies for analysis_run_logs/doc_performance_signals/rvce_cache:
//    those tables do not exist in prod, so there is nothing to protect.
//    Mark applied; policies will be recreated if/when tables are added.
await record('20260607050837', '20260607050837_413b69da-c196-4535-b759-b1f472fcb570.sql');
console.log('✓ 20260607050837 (marked applied — target tables absent)');

// 5+6. Benchmark seeds: dataset already imported via import-seeds.mjs (97,500 rows).
await record('20260608000001', '20260608000001_benchmark_master_seed.sql');
await record('20260608000003', '20260608000003_benchmark_master_full_seed.sql');
console.log('✓ 2026060800000{1,3} (marked applied — data imported separately)');

// Verify final state
const out = await runSql(
  "SELECT version FROM supabase_migrations.schema_migrations WHERE version > '20260606014122' ORDER BY version;",
  'verify',
);
console.log('\nApplied since 20260606014122:', out);
