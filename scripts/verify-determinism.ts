#!/usr/bin/env tsx
/**
 * Genesis Protocol P2 — determinism gate.
 *
 * Re-runs the 25 canonical engine fixtures TWICE with the same inputs and
 * asserts that JSON-stringified outputs are byte-identical across runs.
 * The deterministic engine MUST be reproducible bit-for-bit; any drift
 * means a hidden source of nondeterminism crept into the math layer
 * (Date.now, Math.random, undefined property order, etc.).
 *
 * Wired into CI. Exits non-zero on any divergence.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const FIXTURE_TEST = 'src/__tests__/engine-regression-25.test.ts';
if (!existsSync(FIXTURE_TEST)) {
  console.error(`❌ verify-determinism: fixture file missing at ${FIXTURE_TEST}`);
  process.exit(2);
}

function runOnce(label: string): string {
  // Vitest with --reporter=json gives us a stable, sorted-by-suite output we
  // can diff. We do not depend on console.log ordering inside the test.
  const r = spawnSync(
    'bunx',
    ['vitest', 'run', FIXTURE_TEST, '--reporter=json', '--no-color'],
    { encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0', TZ: 'UTC' } },
  );
  if (r.status !== 0) {
    console.error(`❌ verify-determinism: fixture run "${label}" failed (exit ${r.status})`);
    console.error(r.stdout?.slice(-2000));
    console.error(r.stderr?.slice(-2000));
    process.exit(1);
  }
  // Vitest JSON reporter writes to stdout. Trim to the JSON payload boundaries.
  const out = r.stdout || '';
  const start = out.indexOf('{');
  const end = out.lastIndexOf('}');
  if (start < 0 || end < 0) {
    console.error(`❌ verify-determinism: no JSON payload from vitest in "${label}"`);
    process.exit(1);
  }
  const json = JSON.parse(out.slice(start, end + 1));
  // Strip volatile fields: durations, start/end timestamps, process ids.
  const stripped = JSON.stringify(stripVolatile(json), Object.keys(json).sort());
  return stripped;
}

function stripVolatile(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripVolatile);
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(node).sort()) {
      if (/duration|start|end|time|pid|version|id$/i.test(k)) continue;
      out[k] = stripVolatile((node as Record<string, unknown>)[k]);
    }
    return out;
  }
  return node;
}

console.log('▶ verify-determinism: running 25-fixture engine suite (1/2)…');
const a = runOnce('run-1');
console.log('▶ verify-determinism: running 25-fixture engine suite (2/2)…');
const b = runOnce('run-2');

if (a !== b) {
  console.error('❌ verify-determinism: outputs diverged across two runs.');
  // Surface a tiny preview to make the diff scannable in CI logs.
  const aPreview = a.slice(0, 800);
  const bPreview = b.slice(0, 800);
  console.error('--- run-1 (first 800 chars)');
  console.error(aPreview);
  console.error('--- run-2 (first 800 chars)');
  console.error(bPreview);
  process.exit(1);
}

console.log('✅ verify-determinism: 25 fixtures byte-identical across two runs.');
