/**
 * CI guard: verify-deploy-coverage
 * =================================
 * Makes the "fix shipped but never deployed" bug class structurally impossible.
 *
 * Enforces TWO invariants:
 *   1. COVERAGE  — every directory under supabase/functions/ is EITHER in the
 *      production-deploy.yml FUNCTIONS=() array OR in supabase/functions/.deploy-ignore.
 *      (Root cause of BUG-037/038: parse-document & 6 others existed but were
 *      never in the deploy list, so their fixes sat dead on main.)
 *   2. INVOKE CLOSURE — no DEPLOYED function may `.invoke('x')` a function `x`
 *      that is not itself deployed. (Root cause of the analyze-pro-worker break:
 *      analyze-business invoked a worker that wasn't in the deploy list, so Pro
 *      audits queued jobs that nothing processed.)
 *
 * Run locally:  npx tsx scripts/verify-deploy-coverage.ts
 * Run in CI:    a step in ci.yml (fails the build on drift).
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = decodeURIComponent(
  new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
).replace(/[/\\]$/, '');
const FUNCTIONS_DIR = join(ROOT, 'supabase', 'functions');
const DEPLOY_YML = join(ROOT, '.github', 'workflows', 'production-deploy.yml');
const IGNORE_FILE = join(FUNCTIONS_DIR, '.deploy-ignore');

function fail(msg: string): never {
  console.error(`\n❌ deploy-coverage: ${msg}\n`);
  process.exit(1);
}

// 1. All function directories on disk (skip _shared and any _-prefixed helper dirs).
const functionDirs = readdirSync(FUNCTIONS_DIR)
  .filter((name) => !name.startsWith('_') && !name.startsWith('.'))
  .filter((name) => {
    try {
      return statSync(join(FUNCTIONS_DIR, name)).isDirectory();
    } catch {
      return false;
    }
  })
  .sort();

// 2. Parse the FUNCTIONS=( ... ) array out of production-deploy.yml.
// Line-based, not regex: comment lines may contain ')' (e.g. "# Billing (...)"),
// which would prematurely end a non-greedy regex. The array closes with a line
// whose trimmed content is exactly ')'.
const ymlLines = readFileSync(DEPLOY_YML, 'utf8').split('\n');
const startIdx = ymlLines.findIndex((l) => /FUNCTIONS=\(/.test(l));
if (startIdx === -1) fail('Could not find FUNCTIONS=( … ) array in production-deploy.yml');
const deployed = new Set<string>();
for (let i = startIdx + 1; i < ymlLines.length; i++) {
  const raw = ymlLines[i].replace(/#.*$/, '').trim(); // strip comments + whitespace
  if (raw === ')') break;
  if (raw.length > 0) deployed.add(raw);
}

// 3. Parse the .deploy-ignore allowlist.
if (!existsSync(IGNORE_FILE)) fail(`Missing allowlist: ${IGNORE_FILE}`);
const ignored = new Set(
  readFileSync(IGNORE_FILE, 'utf8')
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line.length > 0)
);

// ── Invariant 1: coverage ────────────────────────────────────────────────────
const uncovered = functionDirs.filter((fn) => !deployed.has(fn) && !ignored.has(fn));
if (uncovered.length > 0) {
  fail(
    `These edge functions are neither deployed nor ignored:\n` +
      uncovered.map((f) => `   • ${f}`).join('\n') +
      `\n\nAdd each to the FUNCTIONS=() array in .github/workflows/production-deploy.yml\n` +
      `(to deploy it) OR to supabase/functions/.deploy-ignore with a reason.`
  );
}

// ── Invariant 1b: the two lists are disjoint (2026-10-16) ───────────────────
// #246 added functions that .deploy-ignore deliberately excluded (with
// reasons) to the deploy list, and nothing noticed — which redeployed the
// decommissioned calculate-financials engine. Being in both lists is now an
// error: removing a function from .deploy-ignore must be an explicit change.
const inBoth = [...deployed].filter((fn) => ignored.has(fn));
if (inBoth.length > 0) {
  fail(
    `These functions are in BOTH the deploy list and .deploy-ignore:\n` +
      inBoth.map((f) => `   • ${f}`).join('\n') +
      `\n\n.deploy-ignore entries are deliberate exclusions. Remove a function from\n` +
      `.deploy-ignore (with a reason in the PR) before deploying it — or drop it from the deploy list.`
  );
}

// ── Invariant 1c: decommissioned functions stay inert (P0-23) ────────────────
// The repo copy must be the 410 stub, and it must never be in the deploy list.
const DECOMMISSIONED = ['calculate-financials'];
for (const fn of DECOMMISSIONED) {
  if (deployed.has(fn)) fail(`${fn} is decommissioned (P0-23) and must not be in the deploy list.`);
  const p = join(FUNCTIONS_DIR, fn, 'index.ts');
  if (existsSync(p)) {
    const src = readFileSync(p, 'utf8');
    if (!/status:\s*410/.test(src) || src.split('\n').length > 40) {
      fail(`${fn}/index.ts must remain the inert 410 stub (P0-23); it looks like real logic was restored.`);
    }
  }
}

// Stale entries: a name in the deploy list or ignore file that no longer exists.
const known = new Set(functionDirs);
const staleDeployed = [...deployed].filter((fn) => !known.has(fn));
const staleIgnored = [...ignored].filter((fn) => !known.has(fn));
if (staleDeployed.length > 0) {
  fail(`Deploy list references functions that don't exist on disk: ${staleDeployed.join(', ')}`);
}
if (staleIgnored.length > 0) {
  fail(`.deploy-ignore references functions that don't exist on disk: ${staleIgnored.join(', ')}`);
}

// ── Invariant 2: invoke closure ──────────────────────────────────────────────
// A deployed function must not invoke a function that isn't itself deployed.
const invokeViolations: string[] = [];
for (const fn of deployed) {
  const indexPath = join(FUNCTIONS_DIR, fn, 'index.ts');
  if (!existsSync(indexPath)) continue;
  const src = readFileSync(indexPath, 'utf8');
  const re = /\.invoke\(\s*['"]([a-z][a-z0-9-]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const target = m[1];
    if (known.has(target) && !deployed.has(target)) {
      invokeViolations.push(`   • ${fn} → invokes '${target}' (not deployed)`);
    }
  }
}
if (invokeViolations.length > 0) {
  fail(
    `Deployed functions invoke undeployed workers (jobs would queue but never run):\n` +
      [...new Set(invokeViolations)].join('\n') +
      `\n\nAdd the invoked function to the deploy list.`
  );
}

console.log(
  `✅ deploy-coverage: ${deployed.size} deployed, ${ignored.size} ignored, ` +
    `${functionDirs.length} total — full coverage, invoke-closure clean.`
);
