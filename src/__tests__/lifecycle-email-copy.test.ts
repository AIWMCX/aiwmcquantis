import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TIERS } from '@/config/tiers';

// Buy-blockers #121/#122: the first emails a sign-up reads said "3 free
// analyses" (the plan has 5), promised market analysis (paid-only) and
// "investor-ready" / "bank-ready" PDFs, and "exactly" when they'd break even.
// The day 2-7 nurture series claimed 200+ industries, consulting-grade work
// worth $5k-$15k and a hard-coded $17.
const lifecycle = readFileSync('supabase/functions/send-lifecycle-email/index.ts', 'utf8');
const welcome = readFileSync('supabase/functions/send-welcome-email/index.ts', 'utf8');

describe('lifecycle and welcome email copy', () => {
  it('free-run count matches the free tier', () => {
    const facts = readFileSync('supabase/functions/_shared/canonical-facts.ts', 'utf8');
    const m = facts.match(/export const FREE_ANALYSES_PER_MONTH = (\d+);/);
    expect(Number(m?.[1])).toBe(TIERS.free.limits.analysesPerMonth);
    expect(lifecycle).toContain('const FREE_RUNS_PER_MONTH = FREE_ANALYSES_PER_MONTH;');
    expect(lifecycle).not.toMatch(/remaining_analyses \|\| 3|Math\.max\(0, 3 -/);
  });
  it('makes no claims the product cannot back', () => {
    for (const bad of [/investor-ready/i, /bank-ready/i, /know exactly/i, /ahead of most/i, /instantly/i, /market analysis/i, /under 2 minutes/i, /200\+ industries/i, /\$5,000/, /#1 (reason|mistake)/i, /competitors are already/i, /\(\$17\/mo\)/, /COMEBACK30/, /\$11\.90/])
      for (const src of [lifecycle, welcome]) expect(src).not.toMatch(bad);
  });
});
