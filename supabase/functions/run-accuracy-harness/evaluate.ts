// Pure, fail-closed evaluation logic for run-accuracy-harness (vitest imports this).
//
// A run may only report PASS when it actually proved something:
//   - at least one APPROVED vector ran (promotion silver/gold, reviewed by
//     both a finance and a different engineering reviewer);
//   - every vector's expectation is well-formed (no {} or bound-less entries);
//   - every expected metric, status and required invariant was checked;
//   - every per-vector result was persisted.
// Anything else is FAIL, NOT_EXECUTED or ERROR, never ok:true.

// abs_tolerance: metric-specific absolute floor (harness v2 contract). A target passes when
// |actual - target| <= max(abs_tolerance, tolerance_pct% x |target|), so target 0 is checkable.
export interface ExpectedRange { min?: number; max?: number; target?: number; abs_tolerance?: number }

export type RunStatus = 'PASS' | 'FAIL' | 'NOT_EXECUTED' | 'ERROR';

export interface VectorRow {
  id: string;
  vector_code: string | null;
  input_data: unknown;
  expected_ranges: unknown;
  expected_statuses?: unknown;
  expected_invariants?: unknown;
  tolerance_pct: number | null;
  promotion_status: string;
  reviewer_finance?: string | null;
  reviewer_engineering?: string | null;
}

export const APPROVED_PROMOTIONS = ['silver', 'gold'] as const;

/** Invariants this harness can evaluate. A vector requiring any other one cannot PASS. */
export const SUPPORTED_INVARIANTS: Record<string, never> = {};

export function isApproved(v: VectorRow): boolean {
  const fin = v.reviewer_finance?.trim();
  const eng = v.reviewer_engineering?.trim();
  return (APPROVED_PROMOTIONS as readonly string[]).includes(v.promotion_status)
    && !!fin && !!eng && fin.toLowerCase() !== eng.toLowerCase();
}

const isFiniteNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Returns a reason code when the vector's expectations can't support a verdict, else null. */
export function expectationProblem(v: VectorRow): string | null {
  const ranges = v.expected_ranges;
  if (!ranges || typeof ranges !== 'object' || Array.isArray(ranges)) return 'EXPECTED_RANGES_NOT_OBJECT';
  const entries = Object.entries(ranges as Record<string, unknown>);
  const statuses = (v.expected_statuses && typeof v.expected_statuses === 'object' && !Array.isArray(v.expected_statuses))
    ? Object.entries(v.expected_statuses as Record<string, unknown>) : [];
  if (entries.length === 0 && statuses.length === 0) return 'EMPTY_EXPECTATION';
  for (const [path, raw] of entries) {
    if (!raw || typeof raw !== 'object') return `BAD_RANGE:${path}`;
    const r = raw as Record<string, unknown>;
    const bounds = (['min', 'max', 'target'] as const).filter((k) => r[k] !== undefined && r[k] !== null);
    if (bounds.length === 0) return `RANGE_WITHOUT_BOUNDS:${path}`;
    if (bounds.some((k) => !isFiniteNum(r[k]))) return `NON_FINITE_BOUND:${path}`;
    if (isFiniteNum(r.min) && isFiniteNum(r.max) && r.min > r.max) return `MIN_GT_MAX:${path}`;
    if (r.abs_tolerance !== undefined && (!isFiniteNum(r.abs_tolerance) || r.abs_tolerance < 0)) return `BAD_ABS_TOLERANCE:${path}`;
    if (r.target === 0 && !(isFiniteNum(r.abs_tolerance) && r.abs_tolerance > 0)) return `ZERO_TARGET_NEEDS_ABS_TOLERANCE:${path}`;
  }
  for (const [path, s] of statuses) if (typeof s !== 'string' || !s) return `BAD_STATUS:${path}`;
  if (v.tolerance_pct != null && (!isFiniteNum(v.tolerance_pct) || v.tolerance_pct < 0)) return 'BAD_TOLERANCE';
  return null;
}

export function getByPath(obj: unknown, path: string): unknown {
  if (obj == null || !path) return undefined;
  // deno-lint-ignore no-explicit-any
  return path.split('.').reduce((acc: any, key) => (acc == null ? undefined : acc[key]), obj);
}

export function compareMetric(actual: unknown, expected: ExpectedRange, tolerancePct: number): { passed: boolean; deviation_pct: number | null } {
  if (!isFiniteNum(actual)) return { passed: false, deviation_pct: null };
  if (expected.min != null && actual < expected.min) {
    return { passed: false, deviation_pct: ((expected.min - actual) / Math.max(1e-9, Math.abs(expected.min))) * 100 };
  }
  if (expected.max != null && actual > expected.max) {
    return { passed: false, deviation_pct: ((actual - expected.max) / Math.max(1e-9, Math.abs(expected.max))) * 100 };
  }
  if (expected.target != null) {
    const diff = Math.abs(actual - expected.target);
    const allowed = Math.max(expected.abs_tolerance ?? 0, (tolerancePct / 100) * Math.abs(expected.target));
    const dev = expected.target === 0 ? null : (diff / Math.abs(expected.target)) * 100;
    return { passed: diff <= allowed, deviation_pct: dev };
  }
  // Reached only with min and/or max present (validated): inside the range.
  return { passed: true, deviation_pct: 0 };
}

export interface VectorVerdict {
  passed: boolean;
  failed: string[];
  metric_results: Record<string, { passed: boolean; deviation_pct: number | null; actual: unknown }>;
  status_results: Record<string, { passed: boolean; expected: string; actual: unknown }>;
  invariant_results: Array<{ name: string; evaluated: boolean; passed: boolean; reason?: string }>;
  worst_deviation_pct: number | null;
}

/** Judge one vector's engine output. Every expected item must be checked and pass. */
export function judgeVector(v: VectorRow, actual: unknown, engineError: string | null): VectorVerdict {
  const tolerance = v.tolerance_pct ?? 1;
  const out: VectorVerdict = { passed: engineError === null, failed: [], metric_results: {}, status_results: {}, invariant_results: [], worst_deviation_pct: null };
  if (engineError) out.failed.push(`engine:${engineError}`);
  let worst = 0;
  for (const [path, exp] of Object.entries((v.expected_ranges ?? {}) as Record<string, ExpectedRange>)) {
    const val = getByPath(actual, path);
    const cmp = compareMetric(val, exp, tolerance);
    out.metric_results[path] = { ...cmp, actual: val };
    if (!cmp.passed) {
      out.passed = false; out.failed.push(path);
      if (cmp.deviation_pct != null && Math.abs(cmp.deviation_pct) > Math.abs(worst)) worst = cmp.deviation_pct;
    }
  }
  const statuses = (v.expected_statuses && typeof v.expected_statuses === 'object') ? v.expected_statuses as Record<string, string> : {};
  for (const [path, want] of Object.entries(statuses)) {
    const got = getByPath(actual, path);
    const ok = got === want;
    out.status_results[path] = { passed: ok, expected: want, actual: got };
    if (!ok) { out.passed = false; out.failed.push(`status:${path}`); }
  }
  const invariants = Array.isArray(v.expected_invariants) ? v.expected_invariants : [];
  for (const inv of invariants) {
    const name = typeof inv === 'string' ? inv : String((inv as { name?: unknown })?.name ?? inv);
    // No invariant evaluators exist yet: a required invariant that wasn't evaluated can't pass.
    out.invariant_results.push({ name, evaluated: false, passed: false, reason: 'INVARIANT_NOT_IMPLEMENTED' });
    out.passed = false; out.failed.push(`invariant:${name}`);
  }
  out.worst_deviation_pct = worst || null;
  return out;
}

export interface RunSummary {
  status: RunStatus;
  ok: boolean;
  reason: string | null;
  vectors_active: number;
  vectors_approved: number;
  vectors_evaluated: number;
  vectors_passed: number;
  vectors_persisted: number;
  skipped_unapproved: number;
  invalid_expectations: number;
}

/** Overall verdict. ok is true ONLY for PASS. */
export function summarize(input: {
  active: number; approved: number; evaluated: number; passed: number; persisted: number; invalid: number; persistErrors: number;
}): RunSummary {
  const base = {
    vectors_active: input.active, vectors_approved: input.approved, vectors_evaluated: input.evaluated,
    vectors_passed: input.passed, vectors_persisted: input.persisted,
    skipped_unapproved: input.active - input.approved, invalid_expectations: input.invalid,
  };
  let status: RunStatus; let reason: string | null = null;
  if (input.approved === 0) { status = 'NOT_EXECUTED'; reason = input.active === 0 ? 'NO_ACTIVE_VECTORS' : 'NO_APPROVED_VECTORS'; }
  else if (input.persistErrors > 0 || input.persisted !== input.evaluated) { status = 'ERROR'; reason = 'EVIDENCE_NOT_PERSISTED'; }
  else if (input.evaluated !== input.approved) { status = 'ERROR'; reason = 'NOT_ALL_APPROVED_VECTORS_EVALUATED'; }
  else if (input.invalid > 0 || input.passed !== input.evaluated) { status = 'FAIL'; reason = input.invalid > 0 ? 'INVALID_EXPECTATIONS' : 'VECTOR_FAILURES'; }
  else status = 'PASS';
  return { status, ok: status === 'PASS', reason, ...base };
}
