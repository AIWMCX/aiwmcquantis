/**
 * Genesis P1/P2 — R3 enforcement integration test.
 *
 * Mirrors `scripts/verify-r3-enforcement.ts` as an in-process test so the
 * regression is caught by `bun run test:quality` (the developer's fast loop)
 * as well as the CI shell script. The set of allow-listed functions MUST
 * stay in sync between the two — this test fails if it doesn't.
 *
 * The test also performs a live R3 round-trip on a representative payload
 * to prove the pipeline rejects malformed outputs end-to-end.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { r3Validate, defaultFinancialReconciler } from '@/lib/r3-validator';

const FN_DIR = 'supabase/functions';
const DEPLOY_WORKFLOW = '.github/workflows/production-deploy.yml';
const ENFORCEMENT_SCRIPT = 'scripts/verify-r3-enforcement.ts';

function listDeployed(): string[] {
  if (!existsSync(DEPLOY_WORKFLOW)) return [];
  const m = readFileSync(DEPLOY_WORKFLOW, 'utf8').match(/FUNCTIONS=\(\n([\s\S]*?)\n\s*\)/);
  if (!m) return [];
  return m[1]
    .split('\n')
    .map((l) => l.trim().replace(/#.*$/, '').trim())
    .filter(Boolean);
}

function readAll(fn: string): string {
  const dir = join(FN_DIR, fn);
  if (!existsSync(dir)) return '';
  let combined = '';
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isFile() && (f.endsWith('.ts') || f.endsWith('.js'))) {
      combined += '\n' + readFileSync(p, 'utf8');
    }
  }
  return combined;
}

function extractAllowlist(): Set<string> {
  const src = readFileSync(ENFORCEMENT_SCRIPT, 'utf8');
  const m = src.match(/MIGRATION_ALLOWLIST\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/);
  if (!m) return new Set();
  const out = new Set<string>();
  for (const line of m[1].split('\n')) {
    const s = line.match(/['"]([^'"]+)['"]/);
    if (s) out.add(s[1]);
  }
  return out;
}

describe('R3 enforcement at every LLM boundary', () => {
  const allow = extractAllowlist();
  const deployed = listDeployed();

  it('parses the production-deploy FUNCTIONS array', () => {
    expect(deployed.length).toBeGreaterThan(10);
  });

  it('every non-allowlisted deployed LLM function wires R3', () => {
    const violations: string[] = [];
    for (const fn of deployed) {
      const src = readAll(fn);
      if (!src) continue;
      const usesLlm = /(from|import)\s*\(?\s*['"][^'"]*_shared\/(llm-call|hybrid-validator)[^'"]*['"]/.test(src);
      if (!usesLlm) continue;
      const usesR3 =
        /(from|import)\s*\(?\s*['"][^'"]*_shared\/r3-validator[^'"]*['"]/.test(src) ||
        /(from|import)\s*\(?\s*['"][^'"]*_shared\/schemas[^'"]*['"]/.test(src) ||
        /(from|import)\s*\(?\s*['"][^'"]*boundary-schemas[^'"]*['"]/.test(src) ||
        /\br3Validate\s*\(/.test(src);
      if (!usesR3 && !allow.has(fn)) violations.push(fn);
    }
    expect(violations, `un-wired LLM functions: ${violations.join(', ')}`).toEqual([]);
  });

  it('migration allowlist is monotonically shrinking (review before adding)', () => {
    // The allowlist exists to be drained. This test pins the upper bound so
    // accidental additions show up in code review. Lower this number as the
    // allowlist shrinks.
    expect(allow.size).toBeLessThanOrEqual(12);
  });
});

describe('R3 round-trip on representative LLM payload', () => {
  const Schema = z.object({
    gross_margin_pct: z.number(),
    net_margin_pct: z.number(),
    ltv: z.number(),
    cac: z.number(),
    ltv_cac: z.number(),
  });
  const reconcile = defaultFinancialReconciler<z.infer<typeof Schema>>({
    percentFields: ['gross_margin_pct', 'net_margin_pct'],
    finiteFields: ['ltv', 'cac', 'ltv_cac'],
    ltvCacField: 'ltv_cac',
  });

  it('accepts a clean fenced JSON payload after repair', () => {
    const raw = '```json\n' + JSON.stringify({
      gross_margin_pct: 72, net_margin_pct: 18, ltv: 1200, cac: 240, ltv_cac: 5,
    }) + '\n```';
    const r = r3Validate(raw, Schema, reconcile);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.repaired).toBe(true);
  });

  it('rejects implausible LTV:CAC at the reconcile stage', () => {
    const raw = JSON.stringify({
      gross_margin_pct: 80, net_margin_pct: 20, ltv: 99_000, cac: 100, ltv_cac: 990,
    });
    const r = r3Validate(raw, Schema, reconcile);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toBe('reconcile');
  });

  it('rejects non-JSON garbage with a typed schema failure', () => {
    const r = r3Validate('this is not json', Schema, reconcile);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toBe('schema');
  });
});
