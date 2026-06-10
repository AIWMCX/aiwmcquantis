// One-off production seed importer.
// Streams each seed_*.sql through the Supabase Management API query endpoint,
// chunking the single 19,500-row INSERT into batches the API can accept.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/import-seeds.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_REF = 'dmlxrvfyqsakyjomsvdj';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const CHUNK_ROWS = 1000;

if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1); }

async function runSql(query, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const resp = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (resp.ok) return resp.json();
    const text = await resp.text();
    if (attempt === 3) throw new Error(`${label}: HTTP ${resp.status} ${text.slice(0, 300)}`);
    console.warn(`  retry ${attempt} for ${label}: HTTP ${resp.status}`);
    await new Promise(r => setTimeout(r, 1500 * attempt));
  }
}

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const seedFiles = readdirSync(migrationsDir).filter(f => f.startsWith('seed_')).sort();

for (const file of seedFiles) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  const tableMatch = sql.match(/TRUNCATE (\w+)/);
  const insertMatch = sql.match(/INSERT INTO (\w+) \(([^)]+)\) VALUES/);
  if (!tableMatch || !insertMatch) { console.error(`${file}: could not parse header`); process.exit(1); }
  const table = insertMatch[1];
  const cols = insertMatch[2];
  const insertHeader = `INSERT INTO ${table} (${cols}) VALUES\n`;

  // Rows are the lines between VALUES and the final ';' — each starts with '  ('
  const valuesStart = sql.indexOf('VALUES') + 'VALUES'.length;
  const body = sql.slice(valuesStart);
  const rows = body.split('\n').map(l => l.trim()).filter(l => l.startsWith('('));
  // Strip trailing comma/semicolon from each row tuple
  const tuples = rows.map(r => r.replace(/[,;]\s*$/, ''));

  console.log(`\n=== ${file} → ${table}: ${tuples.length} rows, ${Math.ceil(tuples.length / CHUNK_ROWS)} chunks ===`);

  await runSql(`TRUNCATE ${table} RESTART IDENTITY CASCADE;`, `${table} TRUNCATE`);
  console.log(`  truncated ${table}`);

  for (let i = 0; i < tuples.length; i += CHUNK_ROWS) {
    const chunk = tuples.slice(i, i + CHUNK_ROWS);
    const stmt = insertHeader + chunk.join(',\n') + ';';
    await runSql(stmt, `${table} rows ${i}-${i + chunk.length}`);
    process.stdout.write(`\r  inserted ${Math.min(i + CHUNK_ROWS, tuples.length)}/${tuples.length}`);
  }
  const count = await runSql(`SELECT count(*) AS n FROM ${table};`, `${table} count`);
  console.log(`\n  ✓ ${table} final count: ${JSON.stringify(count)}`);
}
console.log('\nAll seed imports complete.');
