/**
 * Phase 1 test — RVCE fan-out invariants.
 *
 * Source-level (parsed as text, since rvce-fanout.ts is Deno) plus an
 * importable subset (cache-key + cap math is in `_shared/tier.ts` which
 * is plain TS without Deno globals at module-load time).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FANOUT_PATH = resolve(__dirname, '../../supabase/functions/_shared/rvce-fanout.ts');
const TIER_PATH = resolve(__dirname, '../../supabase/functions/_shared/tier.ts');
const fanoutSrc = readFileSync(FANOUT_PATH, 'utf8');
const tierSrc = readFileSync(TIER_PATH, 'utf8');

describe('RVCE fan-out invariants', () => {
  it('observation caps are 20 / 40 / 100', () => {
    // RVCE_OBS_CAP literal must contain FREE: 20, PLUS: 40, PRO: 100.
    expect(tierSrc).toMatch(/FREE:\s*20/);
    expect(tierSrc).toMatch(/PLUS:\s*40/);
    expect(tierSrc).toMatch(/PRO:\s*100/);
  });

  it('cost ceilings are 0.03 / 0.12 / 0.40', () => {
    expect(tierSrc).toMatch(/FREE:\s*0\.03/);
    expect(tierSrc).toMatch(/PLUS:\s*0\.12/);
    expect(tierSrc).toMatch(/PRO:\s*0\.4/);
  });

  it('fan-out concurrency is bounded (<=12)', () => {
    const m = tierSrc.match(/RVCE_FANOUT_CONCURRENCY\s*=\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThan(0);
    expect(Number(m![1])).toBeLessThanOrEqual(12);
  });

  it('feature flag gate is present and defaults to false', () => {
    expect(tierSrc).toMatch(/isRvceFanoutEnabled/);
    expect(tierSrc).toMatch(/RVCE_FANOUT_ENABLED/);
    // default branch returns 'false' string
    expect(tierSrc).toMatch(/['"]false['"]/);
  });

  it('cache key is deterministic per (variable, biz, location, cap)', () => {
    expect(tierSrc).toMatch(/buildRvceCacheKey/);
    expect(tierSrc).toMatch(/cap\$\{parts\.tier_cap\}/);
  });

  it('fan-out engine clamps cached evidence to tier cap', () => {
    expect(fanoutSrc).toMatch(/observations\.length > cap/);
    expect(fanoutSrc).toMatch(/observations\.slice\(0, cap\)/);
  });

  it('Haiku calibrator is opt-in via ANTHROPIC_API_KEY', () => {
    expect(fanoutSrc).toMatch(/calibrateWithHaiku/);
    expect(fanoutSrc).toMatch(/if \(!ANTHROPIC_API_KEY\) return perVariable/);
  });

  it('discrepancy thresholds: OK<25, WARN<60, OUTLIER>=60', () => {
    expect(fanoutSrc).toMatch(/abs < 25 \? 'OK' : abs < 60 \? 'WARN' : 'OUTLIER'/);
  });

  it('insufficient observations (<3) returns NO_DATA', () => {
    expect(fanoutSrc).toMatch(/observations\.length < 3/);
    expect(fanoutSrc).toMatch(/'NO_DATA'/);
  });
});
