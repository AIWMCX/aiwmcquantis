#!/usr/bin/env node
// =============================================================================
// verify-payback-integrity.mjs — catches the exact bug class found 2026-07-10:
// a static example ("mobile-app-startup-san-francisco") displayed a payback
// figure that reconciled against MONTHLY REVENUE instead of MONTHLY PROFIT
// ($180,000 / $15,200 = 11.8mo, matching the wrong displayed value, instead
// of $180,000 / $4,600 = 39.1mo). That one instance was fixed by hand
// (commit fbf3654d) after a one-off manual scan. This script makes that scan
// permanent and repeatable across every example in exampleData.ts and
// exampleDataExpanded.ts, so a future hand-authored example can't silently
// reintroduce the same class of error.
//
// IMPORTANT SCOPE NOTE: the real engine (supabase/functions/analyze-business/
// index.ts:1366-1399) computes payback via a ramp-aware cumulative-cash-flow
// simulation (6-month revenue ramp, then 5%/mo growth), NOT a simple
// cost/profit divisor. This script cannot replicate that simulation from the
// stored example fields alone (the ramp needs a monthly expense/revenue
// breakdown that isn't stored in these static objects). So this script does
// NOT assert "payback must equal cost/profit" — it flags the specific,
// unambiguous failure signature already proven wrong: displayed payback
// reconciling suspiciously well against REVENUE instead of PROFIT. Anything
// that reconciles against neither cleanly is reported as a WARN for manual
// review, not a hard failure, because the real ramp-aware value legitimately
// differs from the naive divisor.
//
// Usage: node scripts/verify-payback-integrity.mjs
// Exits non-zero only on the REVENUE-divisor signature (the proven bug class).
// =============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FILES = [
  'src/pages/examples/exampleData.ts',
  'src/pages/examples/exampleDataExpanded.ts',
];

function parseMoney(s) {
  const cleaned = String(s).replace(/[^\d.]/g, '');
  return cleaned ? parseFloat(cleaned) : null;
}

function parseMonths(s) {
  const m = String(s).match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

const REVENUE_DIVISOR_BUGS = [];
const NEEDS_REVIEW = [];
let totalChecked = 0;

for (const relPath of FILES) {
  const filePath = path.join(ROOT, relPath);
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    console.warn(`  ⚠ could not read ${relPath}, skipping`);
    continue;
  }

  // Match "'slug': { ... metrics: { ... } ... }" pairs. Non-greedy across the
  // whole remaining file content, scoped by requiring metrics{} to follow
  // shortly after the slug (DOTALL is necessary since these span lines).
  const entries = [...content.matchAll(/'([a-z0-9-]+)':\s*\{[\s\S]*?metrics:\s*\{([^}]+)\}/g)];

  for (const [, slug, metricsBlock] of entries) {
    const rev = parseMoney(metricsBlock.match(/monthlyRevenue:\s*'([^']+)'/)?.[1]);
    const profit = parseMoney(metricsBlock.match(/monthlyProfit:\s*'([^']+)'/)?.[1]);
    const cost = parseMoney(metricsBlock.match(/startupCost:\s*'([^']+)'/)?.[1]);
    const displayedPayback = parseMonths(metricsBlock.match(/paybackMonths:\s*'([^']+)'/)?.[1]);

    if (!rev || !profit || !cost || displayedPayback === null || profit <= 0) continue;
    totalChecked++;

    const fromProfit = cost / profit;
    const fromRevenue = rev > 0 ? cost / rev : null;
    const errProfit = Math.abs(fromProfit - displayedPayback);
    const errRevenue = fromRevenue !== null ? Math.abs(fromRevenue - displayedPayback) : Infinity;

    // The proven bug signature: displayed value matches revenue-divisor
    // tightly (within 0.5 months) while missing the profit-divisor badly
    // (off by more than 1 month). This is the exact pattern found in the
    // mobile-app example — unambiguous, not a ramp-model artifact.
    if (errRevenue < 0.5 && errProfit > 1.0) {
      REVENUE_DIVISOR_BUGS.push({
        file: relPath, slug, displayedPayback,
        cost, profit, rev, fromProfit: fromProfit.toFixed(1), fromRevenue: fromRevenue.toFixed(1),
      });
    } else if (errProfit > 1.0 && errRevenue > 1.0) {
      // Doesn't match either simple divisor — could be a legitimate
      // ramp-aware value, could be stale hand-authored content. Not a hard
      // failure; flagged for the manual example-by-example audit tracked in
      // docs/MP-ACCURACY-AUDIT-AND-TODO-v1.0.md.
      NEEDS_REVIEW.push({
        file: relPath, slug, displayedPayback, cost, profit, rev,
        fromProfit: fromProfit.toFixed(1), fromRevenue: fromRevenue !== null ? fromRevenue.toFixed(1) : 'n/a',
      });
    }
  }
}

console.log(`\n== Payback Integrity Check — ${totalChecked} examples with complete metrics scanned ==\n`);

if (REVENUE_DIVISOR_BUGS.length) {
  console.error(`✗ ${REVENUE_DIVISOR_BUGS.length} example(s) with the CONFIRMED revenue-divisor bug signature:\n`);
  for (const b of REVENUE_DIVISOR_BUGS) {
    console.error(`  ${b.file} :: ${b.slug}`);
    console.error(`    displayed=${b.displayedPayback}mo  cost=$${b.cost}  profit=$${b.profit}  revenue=$${b.rev}`);
    console.error(`    from profit=${b.fromProfit}mo (correct basis)  from revenue=${b.fromRevenue}mo (matches displayed — WRONG)\n`);
  }
} else {
  console.log('✓ No examples match the confirmed revenue-divisor bug signature.\n');
}

if (NEEDS_REVIEW.length) {
  console.warn(`⚠ ${NEEDS_REVIEW.length} example(s) don't reconcile against either simple divisor — needs manual review (see docs/MP-ACCURACY-AUDIT-AND-TODO-v1.0.md):\n`);
  for (const b of NEEDS_REVIEW) {
    console.warn(`  ${b.file} :: ${b.slug} — displayed=${b.displayedPayback}mo, from profit=${b.fromProfit}mo, from revenue=${b.fromRevenue}mo`);
  }
  console.warn('');
}

if (REVENUE_DIVISOR_BUGS.length > 0) {
  console.error('FAIL: confirmed revenue-divisor payback bug(s) present. Fix before shipping.');
  process.exit(1);
}
console.log('PASS: no confirmed payback integrity bugs. (Warnings above, if any, are not fatal — see manual-review note.)');
