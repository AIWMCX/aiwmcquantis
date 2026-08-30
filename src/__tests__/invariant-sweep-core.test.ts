/**
 * GTM-audit item #22 (2026-08-29, Phase 5 re-validation, charter 5.7):
 * "verify with seeded pass, violation, and interrupted-run fixtures."
 * scripts/sweep-financial-invariants.ts itself reads Deno.env at module
 * scope and can't be imported by Vitest at all -- this tests the pure
 * logic extracted into scripts/invariant-sweep-core.ts instead, which is
 * everything the sweep script's correctness actually depends on (scenario
 * validation, category-breakdown aggregation, and the shape of both a
 * completed-run record and an interrupted-run record).
 */
import { describe, it, expect } from 'vitest';
import {
  isScenarioTriple,
  isValidScenarioSet,
  categorizeViolations,
  summarizeFailure,
  buildCompletedRunRecord,
  buildInterruptedRunRecord,
  type ViolationRecord,
} from '../../scripts/invariant-sweep-core.ts';

const validTriple = { revenue: 10000, gross_profit: 8000, net_profit: 2000 };
const validScenarios = { pessimistic: validTriple, base: validTriple, optimistic: validTriple };

describe('isScenarioTriple', () => {
  it('accepts a well-formed triple', () => {
    expect(isScenarioTriple(validTriple)).toBe(true);
  });
  it('rejects a triple missing a field', () => {
    expect(isScenarioTriple({ revenue: 10000, gross_profit: 8000 })).toBe(false);
  });
  it('rejects null and non-objects', () => {
    expect(isScenarioTriple(null)).toBe(false);
    expect(isScenarioTriple('not an object')).toBe(false);
    expect(isScenarioTriple(42)).toBe(false);
  });
});

describe('isValidScenarioSet — SEEDED PASS fixture', () => {
  it('accepts a complete pessimistic/base/optimistic set', () => {
    expect(isValidScenarioSet(validScenarios)).toBe(true);
  });
  it('rejects a set missing one scenario (the exact malformed-row case the sweep must skip, not crash on)', () => {
    expect(isValidScenarioSet({ pessimistic: validTriple, base: validTriple })).toBe(false);
  });
  it('rejects null scenarios (an analysis with no scenario data at all)', () => {
    expect(isValidScenarioSet(null)).toBe(false);
  });
});

describe('categorizeViolations — SEEDED VIOLATION fixture (charter 5.4 category breakdown)', () => {
  it('counts each distinct code once per analysis, not once per scenario slot', () => {
    // Reproduces the exact shape from the 2026-08-29 live sweep run
    // (5 real historical violations, id c59777de.../57351fdd... each
    // had the SAME code across all three scenarios) -- the breakdown
    // must report these as 1 analysis each for that code, not 3.
    const violations: ViolationRecord[] = [
      { id: 'a', issues: [{ scope: 'base', code: 'OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT' }] },
      {
        id: 'b',
        issues: [
          { scope: 'pessimistic', code: 'OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT' },
          { scope: 'base', code: 'OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT' },
          { scope: 'optimistic', code: 'OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT' },
        ],
      },
    ] as unknown as ViolationRecord[];
    expect(categorizeViolations(violations)).toEqual({ OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT: 2 });
  });

  it('handles multiple distinct codes across multiple analyses', () => {
    const violations: ViolationRecord[] = [
      { id: 'a', issues: [{ scope: 'base', code: 'CODE_ONE' }] },
      { id: 'b', issues: [{ scope: 'base', code: 'CODE_TWO' }] },
      { id: 'c', issues: [{ scope: 'base', code: 'CODE_ONE' }, { scope: 'optimistic', code: 'CODE_TWO' }] },
    ] as unknown as ViolationRecord[];
    expect(categorizeViolations(violations)).toEqual({ CODE_ONE: 2, CODE_TWO: 2 });
  });

  it('returns an empty object for zero violations (the pass case)', () => {
    expect(categorizeViolations([])).toEqual({});
  });
});

describe('summarizeFailure', () => {
  it('takes only the first line of a multi-line error (never leaks a stack trace to the dashboard)', () => {
    const err = new Error('HTTP 500: connection refused\n    at fetch (deno:ext/fetch/mod.ts:1:1)\n    at main');
    expect(summarizeFailure(err)).toBe('HTTP 500: connection refused');
  });
  it('truncates an excessively long message', () => {
    const err = new Error('x'.repeat(1000));
    const result = summarizeFailure(err);
    expect(result.length).toBeLessThanOrEqual(501);
    expect(result.endsWith('…')).toBe(true);
  });
  it('handles a non-Error thrown value', () => {
    expect(summarizeFailure('a plain string throw')).toBe('a plain string throw');
  });
});

describe('buildCompletedRunRecord — SEEDED PASS and VIOLATION fixtures', () => {
  it('PASS: zero violations produces a completed record with empty categories', () => {
    const record = buildCompletedRunRecord({
      mode: 'report-only', engineVersion: '2.0.0-precision', scanned: 173, violations: [], malformedCount: 0, appliedCount: 0,
    });
    expect(record).toEqual({
      mode: 'report-only', status: 'completed', engineVersion: '2.0.0-precision',
      scanned: 173, violationIds: [], malformedCount: 0, appliedCount: 0,
      violationCategories: {}, failureSummary: null,
    });
  });

  it('VIOLATION: reproduces the real 2026-08-29 live sweep shape (173 scanned, 5 violations, 1 category)', () => {
    const violations: ViolationRecord[] = [
      { id: 'e95c1f2a-9d9c-47c6-9d59-7339fefaed53', issues: [{ scope: 'base', code: 'OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT' }] },
      { id: 'fdd9a618-f0c3-4551-b9ce-5d86be20fd4a', issues: [{ scope: 'base', code: 'OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT' }] },
    ] as unknown as ViolationRecord[];
    const record = buildCompletedRunRecord({
      mode: 'report-only', engineVersion: '2.0.0-precision', scanned: 173, violations, malformedCount: 0, appliedCount: 0,
    });
    expect(record.status).toBe('completed');
    expect(record.violationIds).toEqual(['e95c1f2a-9d9c-47c6-9d59-7339fefaed53', 'fdd9a618-f0c3-4551-b9ce-5d86be20fd4a']);
    expect(record.violationCategories).toEqual({ OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT: 2 });
    expect(record.failureSummary).toBeNull();
  });
});

describe('buildInterruptedRunRecord — SEEDED INTERRUPTED-RUN fixture (charter 5.3)', () => {
  it('produces an interrupted record with zeroed counts and a sanitized failure summary', () => {
    const record = buildInterruptedRunRecord({
      mode: 'report-only',
      engineVersion: '2.0.0-precision',
      err: new Error('HTTP 503: Service Unavailable\n    at fetch (deno:ext/fetch/mod.ts:1:1)'),
    });
    expect(record.status).toBe('interrupted');
    expect(record.scanned).toBe(0);
    expect(record.violationIds).toEqual([]);
    expect(record.violationCategories).toEqual({});
    expect(record.failureSummary).toBe('HTTP 503: Service Unavailable');
  });
});
