/**
 * CI guard: verify-env-refs
 * Fails loudly if any file in the source tree references the old Lovable-owned
 * Supabase project (gafxacjhkqsdzwwzhbor) outside of allowed locations.
 *
 * Run: npx tsx scripts/verify-env-refs.ts
 * Run in CI: add as a step before build.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const OLD_REF   = 'gafxacjhkqsdzwwzhbor';
const PROD_REF  = 'dmlxrvfyqsakyjomsvdj';
const ROOT      = decodeURIComponent(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')).replace(/[/\\]$/, '');

// Files/dirs we explicitly allow to contain the old ref (migration history, docs)
const ALLOWED_PATHS: string[] = [
  'supabase/migrations/',
  'docs/',
  '.env.md',
  'scripts/verify-env-refs.ts',  // this file
];

const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.toml', '.html', '.env', '.yml', '.yaml']);

let violations = 0;

function isAllowed(rel: string): boolean {
  return ALLOWED_PATHS.some(p => rel.startsWith(p) || rel === p);
}

function walk(dir: string, base: string) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') && entry !== '.env') continue;  // skip hidden except .env
    const full = join(dir, entry);
    const rel  = full.slice(base.length + 1).replace(/\\/g, '/');

    // Skip node_modules, .vercel, dist
    if (['node_modules', '.vercel', 'dist', '.git'].includes(entry)) continue;

    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, base);
    } else if (SCAN_EXTS.has(extname(entry))) {
      if (isAllowed(rel)) continue;
      const content = readFileSync(full, 'utf8');
      if (content.includes(OLD_REF)) {
        console.error(`\n❌ OLD PROJECT REF found in: ${rel}`);
        // Show the line numbers
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.includes(OLD_REF)) {
            console.error(`   line ${i + 1}: ${line.trim()}`);
          }
        });
        violations++;
      }
    }
  }
}

console.log(`\n🔍 Scanning for stale Supabase project ref: ${OLD_REF}`);
console.log(`   Expected canonical ref: ${PROD_REF}\n`);

walk(ROOT, ROOT);

if (violations === 0) {
  console.log(`✅ All clear — no stale project refs found outside allowed paths.\n`);
  process.exit(0);
} else {
  console.error(`\n💥 ${violations} violation(s) found. Fix before building.\n`);
  process.exit(1);
}
