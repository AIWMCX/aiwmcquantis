import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  expectationProblem, isApproved, judgeVector, summarize, compareMetric, type VectorRow,
} from '../../supabase/functions/run-accuracy-harness/evaluate';

const vec = (over: Partial<VectorRow> = {}): VectorRow => ({
  id: 'v1', vector_code: 'cvp-basic', input_data: {}, tolerance_pct: 0.5,
  expected_ranges: { 'metrics.break_even_revenue': { target: 30000 } },
  expected_statuses: {}, expected_invariants: [],
  promotion_status: 'gold', reviewer_finance: 'fin@x', reviewer_engineering: 'eng@x', ...over,
});

describe('approval', () => {
  it('needs silver/gold and two different reviewers', () => {
    expect(isApproved(vec())).toBe(true);
    expect(isApproved(vec({ promotion_status: 'candidate' }))).toBe(false);
    expect(isApproved(vec({ reviewer_finance: null }))).toBe(false);
    expect(isApproved(vec({ reviewer_engineering: 'FIN@x', reviewer_finance: 'fin@x' }))).toBe(false);
  });
});

describe('expectation validation (formerly any finite number passed)', () => {
  it('rejects {} and bound-less, non-finite or inverted ranges', () => {
    expect(expectationProblem(vec({ expected_ranges: {} }))).toBe('EMPTY_EXPECTATION');
    expect(expectationProblem(vec({ expected_ranges: { m: {} } }))).toBe('RANGE_WITHOUT_BOUNDS:m');
    expect(expectationProblem(vec({ expected_ranges: { m: { target: Number.NaN } } }))).toBe('NON_FINITE_BOUND:m');
    expect(expectationProblem(vec({ expected_ranges: { m: { max: Infinity } } }))).toBe('NON_FINITE_BOUND:m');
    expect(expectationProblem(vec({ expected_ranges: { m: { min: 5, max: 1 } } }))).toBe('MIN_GT_MAX:m');
    expect(expectationProblem(vec({ expected_ranges: null }))).toBe('EXPECTED_RANGES_NOT_OBJECT');
    expect(expectationProblem(vec())).toBeNull();
  });
  it('a status-only expectation is valid', () => {
    expect(expectationProblem(vec({ expected_ranges: {}, expected_statuses: { 'metrics.break_even_status': 'INSUFFICIENT_INPUTS' } }))).toBeNull();
  });
});

describe('judging a vector', () => {
  const out = { metrics: { break_even_revenue: 30010, break_even_status: 'VALUE' } };
  it('passes a correct value within tolerance', () => {
    expect(judgeVector(vec(), out, null).passed).toBe(true);
  });
  it('fails a corrupted value, a missing value, NaN and an engine error', () => {
    expect(judgeVector(vec(), { metrics: { break_even_revenue: 33000 } }, null).passed).toBe(false);
    expect(judgeVector(vec(), { metrics: {} }, null).passed).toBe(false);
    expect(judgeVector(vec(), { metrics: { break_even_revenue: Number.NaN } }, null).passed).toBe(false);
    expect(judgeVector(vec(), out, 'engine_error: boom').passed).toBe(false);
  });
  it('fails on a wrong status', () => {
    const v = vec({ expected_statuses: { 'metrics.break_even_status': 'INSUFFICIENT_INPUTS' } });
    const j = judgeVector(v, out, null);
    expect(j.passed).toBe(false);
    expect(j.failed).toContain('status:metrics.break_even_status');
  });
  it('a required invariant that cannot be evaluated is not a pass', () => {
    const j = judgeVector(vec({ expected_invariants: ['cash_roll_forward'] }), out, null);
    expect(j.passed).toBe(false);
    expect(j.invariant_results[0]).toMatchObject({ name: 'cash_roll_forward', evaluated: false, passed: false });
  });
  it('target 0 needs an absolute tolerance and is judged by it', () => {
    expect(expectationProblem(vec({ expected_ranges: { m: { target: 0 } } }))).toBe('ZERO_TARGET_NEEDS_ABS_TOLERANCE:m');
    expect(compareMetric(0.004, { target: 0, abs_tolerance: 0.005 }, 1).passed).toBe(true);
    expect(compareMetric(0.009, { target: 0, abs_tolerance: 0.005 }, 1).passed).toBe(false);
    expect(compareMetric(100.4, { target: 100, abs_tolerance: 0.5 }, 0).passed).toBe(true);
  });
  it('compareMetric never passes a range-less expectation by default', () => {
    expect(compareMetric(5, { min: 1, max: 10 }, 1).passed).toBe(true);
    expect(compareMetric(5, { target: 5 }, 0).passed).toBe(true);
  });
});

describe('run summary (ok only on PASS)', () => {
  const s = (o: Partial<Parameters<typeof summarize>[0]>) =>
    summarize({ active: 1, approved: 1, evaluated: 1, passed: 1, persisted: 1, invalid: 0, persistErrors: 0, ...o });
  it('zero vectors is NOT_EXECUTED, not ok', () => {
    expect(s({ active: 0, approved: 0, evaluated: 0, passed: 0, persisted: 0 })).toMatchObject({ status: 'NOT_EXECUTED', ok: false, reason: 'NO_ACTIVE_VECTORS' });
  });
  it('only unapproved vectors is NOT_EXECUTED', () => {
    expect(s({ active: 3, approved: 0, evaluated: 0, passed: 0, persisted: 0 })).toMatchObject({ status: 'NOT_EXECUTED', ok: false, reason: 'NO_APPROVED_VECTORS', skipped_unapproved: 3 });
  });
  it('a failed evidence write is ERROR even if every vector passed', () => {
    expect(s({ persisted: 0, persistErrors: 1 })).toMatchObject({ status: 'ERROR', ok: false, reason: 'EVIDENCE_NOT_PERSISTED' });
  });
  it('invalid expectations or vector failures are FAIL', () => {
    expect(s({ passed: 0, invalid: 1 })).toMatchObject({ status: 'FAIL', ok: false, reason: 'INVALID_EXPECTATIONS' });
    expect(s({ approved: 2, evaluated: 2, persisted: 2, passed: 1 })).toMatchObject({ status: 'FAIL', reason: 'VECTOR_FAILURES' });
  });
  it('one approved, evaluated, persisted, passing vector is PASS', () => {
    expect(s({})).toMatchObject({ status: 'PASS', ok: true, reason: null });
  });
});

describe('handler wiring', () => {
  const src = readFileSync('supabase/functions/run-accuracy-harness/index.ts', 'utf8');
  it('no unconditional ok:true remains and the summary decides ok', () => {
    expect(src).not.toMatch(/ok:\s*true/);
    expect(src).toContain('const summary = summarize(');
    expect(src).toContain('persistErrors++');
  });
  it('selects the reviewer, status and invariant columns it enforces', () => {
    expect(src).toContain('expected_statuses, expected_invariants');
    expect(src).toContain('reviewer_finance, reviewer_engineering');
  });
});
