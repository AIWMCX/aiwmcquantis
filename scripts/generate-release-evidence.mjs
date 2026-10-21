#!/usr/bin/env node
/**
 * Release manifest — the single, generated source of "what is deployed".
 *
 * Runs at the start of `bun run build` and writes public/release.json, which
 * ships with the site at https://www.aiwmcquantis.com/release.json. Every
 * value is derived from the repository at build time — nothing is typed by
 * hand — so README/investor numbers can point here instead of drifting.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')).replace(/[/\\]$/, '');
const p = (...s) => join(ROOT, ...s);
const read = (...s) => readFileSync(p(...s), 'utf8');

function git(args) {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return null; }
}

function walk(dir, test, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, test, acc);
    else if (test(name)) acc.push(full);
  }
  return acc;
}

// Edge functions: deployed = FUNCTIONS=( … ) list; excluded = .deploy-ignore.
// Normalize CRLF before parsing the shell array. Otherwise `#...$` does not
// consume the comment because `$` sees the carriage return, and comments are
// counted as deployed function names on Windows checkouts.
const deployYml = read('.github', 'workflows', 'production-deploy.yml').replace(/\r\n/g, '\n').split('\n');
const start = deployYml.findIndex((l) => /FUNCTIONS=\(/.test(l));
const deployed = [];
for (let i = start + 1; start >= 0 && i < deployYml.length; i++) {
  const raw = deployYml[i].replace(/#.*$/, '').trim();
  if (raw === ')') break;
  if (raw) deployed.push(raw);
}
const ignored = read('supabase', 'functions', '.deploy-ignore').replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean);
const functionDirs = readdirSync(p('supabase', 'functions')).filter((n) => !n.startsWith('_') && !n.startsWith('.') && statSync(p('supabase', 'functions', n)).isDirectory());

const migrations = readdirSync(p('supabase', 'migrations')).filter((f) => /^\d{14}_.+\.sql$/.test(f)).sort();
const engineVersion = (read('src', 'lib', 'financial-engine.ts').match(/export const ENGINE_VERSION = '([^']+)'/) || [])[1] ?? null;
const registryPath = p('src', 'financial', 'formula-registry.v1.json');
const testFiles = walk(p('src'), (n) => /\.test\.(ts|tsx)$/.test(n)).length + walk(p('tests'), (n) => /\.test\.(ts|tsx|mjs)$/.test(n)).length;
const publicRoutes = (read('scripts', 'seo.routes.mjs').match(/\{\s*path:\s*"/g) || []).length;

const manifest = {
  git_sha: process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || git(['rev-parse', 'HEAD']),
  built_at: new Date().toISOString(),
  engine_version: engineVersion,
  formula_registry_sha256: existsSync(registryPath) ? createHash('sha256').update(readFileSync(registryPath)).digest('hex') : null,
  migration_head: migrations.at(-1)?.replace(/\.sql$/, '') ?? null,
  migrations_total: migrations.length,
  edge_functions: { deployed: deployed.length, excluded: ignored.length, total: functionDirs.length },
  test_files: testFiles,
  public_routes: publicRoutes,
  deploy: 'GitHub Actions: CI → production-deploy.yml (migrations, edge functions, prebuilt Vercel deploy). Vercel git auto-deploy is disabled.',
};

writeFileSync(p('public', 'release.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`release manifest: ${manifest.git_sha?.slice(0, 8)} · engine ${engineVersion} · ${deployed.length} functions · ${migrations.length} migrations · ${testFiles} test files`);
