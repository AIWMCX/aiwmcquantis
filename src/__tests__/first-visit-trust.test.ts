import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Guards for the three first-visit defects found live on 2026-11-12 [F5].
const MAIN = readFileSync('src/main.tsx', 'utf8');
const SIGNUP = readFileSync('src/components/auth/SignupForm.tsx', 'utf8');
const LOGIN = readFileSync('src/components/auth/LoginForm.tsx', 'utf8');
const BENCH = readFileSync('supabase/migrations/20261112120000_benchmark_lookup_reapply_fix.sql', 'utf8');

describe('first visit: no false "App updated" prompt', () => {
  it('the update toast only shows to visitors who already ran an older version', () => {
    expect(MAIN).toContain('const hadControllerAtLoad = !!navigator.serviceWorker.controller;');
    expect(MAIN).toContain("event.data.type === 'NEW_VERSION_ACTIVE' && hadControllerAtLoad");
  });
});

describe('auth: no empty "or continue with email" divider', () => {
  it('signup and login show the divider only when the Google button exists', () => {
    for (const src of [SIGNUP, LOGIN]) {
      expect(src).toContain('GOOGLE_OAUTH_ENABLED && (');
      const divider = src.indexOf('Or continue with email');
      const guard = src.lastIndexOf('GOOGLE_OAUTH_ENABLED && (', divider);
      expect(guard).toBeGreaterThan(-1);
    }
  });
});

describe('benchmark_lookup: re-applied fix', () => {
  const query = BENCH.slice(BENCH.indexOf("'SELECT %I AS p25"), BENCH.indexOf('LIMIT 1'));
  it('selects only columns that exist on benchmark_master_* (no source/sample_size/data_version/data_date)', () => {
    expect(query).not.toMatch(/\b(source|sample_size|data_version|data_date)\b/);
  });
  it('binds the same 6 parameters at every level and uses FOUND, not the record', () => {
    expect(BENCH).toContain('$6 IS NULL OR size_bucket');
    expect(BENCH).toContain('v_found := FOUND;');
    expect(BENCH).toContain('IF v_found AND v_row.p50 IS NOT NULL THEN');
    expect(BENCH.slice(BENCH.indexOf('AS $function$'))).not.toContain('v_row := NULL');
  });
  it('never invents a sample size', () => {
    expect(BENCH).toContain("'sample_size', NULL");
  });
});
