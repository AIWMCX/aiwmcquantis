#!/usr/bin/env tsx
/**
 * Genesis Protocol P1/P2 guard — verify R3 enforcement at every LLM boundary.
 *
 * Rule: every deployed edge function that imports `_shared/llm-call.ts`
 * (i.e. makes a paid AI call whose response feeds users) MUST also import
 * either `_shared/r3-validator.ts` or `_shared/schemas` / `boundary-schemas`
 * so the LLM output passes through Schema → Reconcile → Reject.
 *
 * The MIGRATION_ALLOWLIST below names functions that are temporarily exempt
 * while they migrate. Adding to it is a deliberate, reviewed act. Removing
 * from it (after the function is wired) is the only way the gate gets
 * tighter — the gate never loosens silently.
 *
 * Wired into CI; exits non-zero on any non-allowlisted violation.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FN_DIR = 'supabase/functions';
const DEPLOY_WORKFLOW = '.github/workflows/production-deploy.yml';

/**
 * Functions still mid-migration to R3. Each entry needs a line-comment
 * tracking ticket / reason. Empty target: full enforcement.
 */
const MIGRATION_ALLOWLIST = new Set<string>([
  'analyze-plus',             // P2-002 — migrate after analyze-business pattern lands
  'analyze-pro-extension',    // P2-003 — depends on analyze-plus shape
  'analyze-pro-worker',       // P2-004 — async worker, schema lives in calculate-financials
  'ai-narrator',              // P2-005 — narration is free-text by design; R3 wraps the metadata payload only
  'ai-consensus',             // P2-006 — to wire alongside consensus-evaluator refactor
  'rvce-validate',            // P2-007 — RVCE has its own bespoke validator; reconcile R3 wrapper next
  'generate-idea',            // P2-008 — migrating in this branch alongside the helper
]);

function listDeployed(): string[] {
  if (!existsSync(DEPLOY_WORKFLOW)) return [];
  const text = readFileSync(DEPLOY_WORKFLOW, 'utf8');
  // Match `FUNCTIONS=(` … and the first line that is whitespace-then-`)`.
  const m = text.match(/FUNCTIONS=\(\n([\s\S]*?)\n\s*\)/);
  if (!m) return [];
  return m[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean);
}

function readAll(fn: string): string {
  const dir = join(FN_DIR, fn);
  let combined = '';
  try {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isFile() && (f.endsWith('.ts') || f.endsWith('.js'))) {
        combined += '\n' + readFileSync(p, 'utf8');
      }
    }
  } catch {
    /* ignore */
  }
  return combined;
}

const deployed = listDeployed();
if (deployed.length === 0) {
  console.error('❌ verify-r3-enforcement: could not parse production-deploy.yml FUNCTIONS array');
  process.exit(2);
}

const violations: string[] = [];
const wired: string[] = [];

for (const fn of deployed) {
  const src = readAll(fn);
  if (!src) continue;

  const usesLlm = /from\s+['"][^'"]*_shared\/(llm-call|hybrid-validator)['"]/.test(src);
  if (!usesLlm) continue;

  const usesR3 =
    /(from|import)\s*\(?\s*['"][^'"]*_shared\/r3-validator['"]/.test(src) ||
    /(from|import)\s*\(?\s*['"][^'"]*_shared\/schemas['"]/.test(src) ||
    /(from|import)\s*\(?\s*['"][^'"]*boundary-schemas['"]/.test(src) ||
    /\br3Validate\s*\(/.test(src);

  if (usesR3) {
    wired.push(fn);
  } else if (!MIGRATION_ALLOWLIST.has(fn)) {
    violations.push(`  • ${fn}: makes paid LLM calls but does not wire r3-validator / boundary-schemas`);
  }
}

if (violations.length > 0) {
  console.error('❌ verify-r3-enforcement: deployed functions making un-validated LLM calls:');
  console.error(violations.join('\n'));
  console.error('\nFix options:');
  console.error('  1) import { r3Validate } from "../_shared/r3-validator.ts" and wrap every LLM response, OR');
  console.error('  2) import a Zod schema from "../_shared/schemas.ts" and parse the response, OR');
  console.error('  3) (last resort) add the function name to MIGRATION_ALLOWLIST with a ticket reference.');
  process.exit(1);
}

console.log(
  `✅ verify-r3-enforcement: ${wired.length} deployed LLM function(s) wired to R3; ` +
    `${MIGRATION_ALLOWLIST.size} on the migration allowlist (shrink, never grow).`,
);
if (wired.length) console.log(`   wired: ${wired.join(', ')}`);
