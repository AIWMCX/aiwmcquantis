// Pure status-aggregation logic for the system-status edge function.
// Zero Deno-specific imports so Vitest can import and test it directly
// (same extraction pattern as scripts/invariant-sweep-core.ts and
// deriveDegradedFlags() in src/hooks/pdf-verdict.ts -- see
// docs/execution/2026-08-27-canonical-register.md, Phase 5).

export type ComponentStatus = 'operational' | 'degraded' | 'outage' | 'unmonitored';

export interface ComponentSignal {
  key: string;
  name: string;
  description: string;
  status: ComponentStatus;
  detail: string;
  latencyMs?: number;
}

export interface RawDbSignal {
  ok: boolean;
  latencyMs: number;
}

export interface RawCallStatsSignal {
  total: number;
  failed: number;
}

export interface RawSweepSignal {
  status: 'completed' | 'failed' | 'interrupted' | null;
  ageHours: number | null;
  /** Violations found by the most recent run. Null when older rows predate this column or the query didn't select it -- treated as unknown, not zero. */
  violationCount: number | null;
}

export interface RawWebhookSignal {
  total: number;
  failedOrPending: number;
}

export interface RawBenchmarkSignal {
  rowCount: number;
}

/** Threshold below which a failure-rate window is too small to call degraded/outage off of. */
const MIN_SAMPLE_SIZE = 5;

function statusFromFailureRate(total: number, failed: number): { status: ComponentStatus; detail: string } {
  if (total === 0) {
    return { status: 'operational', detail: 'No calls in the observed window' };
  }
  if (total < MIN_SAMPLE_SIZE) {
    const rate = failed / total;
    if (rate >= 0.5) return { status: 'degraded', detail: `${failed}/${total} failed (small sample)` };
    return { status: 'operational', detail: `${total - failed}/${total} succeeded (small sample)` };
  }
  const rate = failed / total;
  if (rate >= 0.5) return { status: 'outage', detail: `${failed}/${total} calls failed (${Math.round(rate * 100)}%)` };
  if (rate >= 0.1) return { status: 'degraded', detail: `${failed}/${total} calls failed (${Math.round(rate * 100)}%)` };
  return { status: 'operational', detail: `${total - failed}/${total} calls succeeded` };
}

export function computeDatabaseSignal(raw: RawDbSignal): ComponentSignal {
  const status: ComponentStatus = !raw.ok ? 'outage' : raw.latencyMs > 1500 ? 'degraded' : 'operational';
  return {
    key: 'database',
    name: 'Database',
    description: 'Accounts, subscriptions, usage tracking, analysis history',
    status,
    detail: raw.ok ? `Responding in ${raw.latencyMs}ms` : 'Query failed',
    latencyMs: raw.latencyMs,
  };
}

export function computeAuthSignal(raw: RawDbSignal): ComponentSignal {
  const status: ComponentStatus = !raw.ok ? 'outage' : raw.latencyMs > 1500 ? 'degraded' : 'operational';
  return {
    key: 'auth',
    name: 'Authentication',
    description: 'Sign in, sign up, session validation',
    status,
    detail: raw.ok ? `Responding in ${raw.latencyMs}ms` : 'Auth check failed',
    latencyMs: raw.latencyMs,
  };
}

/** Deterministic financial engine health: driven by the invariant-sweep result, not by AI call success. */
export function computeEngineSignal(sweep: RawSweepSignal): ComponentSignal {
  if (sweep.status === null) {
    return {
      key: 'engine',
      name: 'Analysis Engine (deterministic)',
      description: 'Financial calculations, RVCE, invariant safety checks',
      status: 'unmonitored',
      detail: 'No invariant sweep has run yet',
    };
  }
  if (sweep.status === 'failed') {
    return {
      key: 'engine',
      name: 'Analysis Engine (deterministic)',
      description: 'Financial calculations, RVCE, invariant safety checks',
      status: 'outage',
      detail: 'Latest invariant sweep failed',
    };
  }
  if (sweep.ageHours !== null && sweep.ageHours > 30) {
    return {
      key: 'engine',
      name: 'Analysis Engine (deterministic)',
      description: 'Financial calculations, RVCE, invariant safety checks',
      status: 'degraded',
      detail: `Last invariant sweep was ${sweep.ageHours.toFixed(1)}h ago (expected within 30h)`,
    };
  }
  if (sweep.status === 'interrupted') {
    return {
      key: 'engine',
      name: 'Analysis Engine (deterministic)',
      description: 'Financial calculations, RVCE, invariant safety checks',
      status: 'degraded',
      detail: 'Latest invariant sweep was interrupted before completing',
    };
  }
  // A "completed" run only means the sweep finished without crashing -- it
  // says nothing about whether it found violations. Conflating the two
  // previously made this page report "clean" for runs that had persisted
  // real violation_count > 0 (caught 2026-09-03: 5 OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT
  // violations, unresolved across 3+ consecutive runs, page still said clean).
  if (sweep.violationCount !== null && sweep.violationCount > 0) {
    return {
      key: 'engine',
      name: 'Analysis Engine (deterministic)',
      description: 'Financial calculations, RVCE, invariant safety checks',
      status: 'degraded',
      detail: `Invariant sweep found ${sweep.violationCount} violation(s), ${sweep.ageHours !== null ? sweep.ageHours.toFixed(1) : '?'}h ago`,
    };
  }
  return {
    key: 'engine',
    name: 'Analysis Engine (deterministic)',
    description: 'Financial calculations, RVCE, invariant safety checks',
    status: 'operational',
    detail: `Invariant sweep clean, ${sweep.ageHours !== null ? sweep.ageHours.toFixed(1) : '?'}h ago`,
  };
}

/** AI-narrative health, deliberately separate from the deterministic engine (charter 6.3). */
export function computeAiNarrativeSignal(calls: RawCallStatsSignal): ComponentSignal {
  const { status, detail } = statusFromFailureRate(calls.total, calls.failed);
  return {
    key: 'ai_narrative',
    name: 'AI Narrative Generation',
    description: 'AI-authored commentary layered on top of the deterministic numbers',
    status,
    detail,
  };
}

export function computeBillingSignal(webhooks: RawWebhookSignal): ComponentSignal {
  const { status, detail } = statusFromFailureRate(webhooks.total, webhooks.failedOrPending);
  return {
    key: 'billing',
    name: 'Billing',
    description: 'Checkout, Stripe webhooks, subscription sync',
    status,
    detail,
  };
}

export function computeBenchmarksSignal(bench: RawBenchmarkSignal): ComponentSignal {
  const status: ComponentStatus = bench.rowCount > 0 ? 'operational' : 'outage';
  return {
    key: 'benchmarks',
    name: 'RVCE / Benchmark Corpus',
    description: 'Industry and location benchmark data backing comparisons',
    status,
    detail: bench.rowCount > 0
      ? `${bench.rowCount.toLocaleString()} rows reachable in one of five master benchmark tables (liveness check only, not the total corpus size)`
      : 'Benchmark table returned zero rows',
  };
}

export function computeReportGenerationSignal(): ComponentSignal {
  return {
    key: 'reports',
    name: 'Report / PDF Generation',
    description: 'Business plan document and PDF export',
    status: 'unmonitored',
    detail: 'Client-side rendering; no server-side success-rate telemetry exists yet. Not claimed as monitored.',
  };
}

export function overallStatus(signals: ComponentSignal[]): ComponentStatus {
  const monitored = signals.filter((s) => s.status !== 'unmonitored');
  if (monitored.some((s) => s.status === 'outage')) return 'outage';
  if (monitored.some((s) => s.status === 'degraded')) return 'degraded';
  return 'operational';
}
