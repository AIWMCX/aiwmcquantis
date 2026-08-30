import { describe, it, expect } from 'vitest';
import {
  computeDatabaseSignal,
  computeAuthSignal,
  computeEngineSignal,
  computeAiNarrativeSignal,
  computeBillingSignal,
  computeBenchmarksSignal,
  computeReportGenerationSignal,
  overallStatus,
} from '../../supabase/functions/system-status/status-core';

// Charter 6.6: "Test that a forced synthetic failure changes the
// appropriate component status." Rather than actually breaking production
// signals to prove this, these tests feed synthetic bad inputs directly
// into the pure aggregation functions and assert the component status
// flips accordingly -- same rationale as the pdf-verdict.ts and
// invariant-sweep-core.ts extractions from Phase 5.

describe('computeDatabaseSignal', () => {
  it('reports operational for a fast successful query', () => {
    expect(computeDatabaseSignal({ ok: true, latencyMs: 50 }).status).toBe('operational');
  });

  it('reports degraded when latency crosses the threshold', () => {
    expect(computeDatabaseSignal({ ok: true, latencyMs: 2000 }).status).toBe('degraded');
  });

  it('SYNTHETIC FAILURE: reports outage when the query fails', () => {
    const signal = computeDatabaseSignal({ ok: false, latencyMs: 10 });
    expect(signal.status).toBe('outage');
    expect(signal.detail).toMatch(/failed/i);
  });
});

describe('computeAuthSignal', () => {
  it('SYNTHETIC FAILURE: reports outage when the auth admin call fails', () => {
    expect(computeAuthSignal({ ok: false, latencyMs: 10 }).status).toBe('outage');
  });

  it('reports operational otherwise', () => {
    expect(computeAuthSignal({ ok: true, latencyMs: 80 }).status).toBe('operational');
  });
});

describe('computeEngineSignal (deterministic financial engine)', () => {
  it('reports unmonitored when no sweep has ever run', () => {
    expect(computeEngineSignal({ status: null, ageHours: null }).status).toBe('unmonitored');
  });

  it('SYNTHETIC FAILURE: reports outage when the latest sweep failed', () => {
    expect(computeEngineSignal({ status: 'failed', ageHours: 1 }).status).toBe('outage');
  });

  it('SYNTHETIC FAILURE: reports degraded when the sweep is stale beyond 30h', () => {
    const signal = computeEngineSignal({ status: 'completed', ageHours: 40 });
    expect(signal.status).toBe('degraded');
    expect(signal.detail).toMatch(/30h/);
  });

  it('reports degraded when the latest sweep was interrupted', () => {
    expect(computeEngineSignal({ status: 'interrupted', ageHours: 2 }).status).toBe('degraded');
  });

  it('reports operational for a fresh, completed sweep', () => {
    expect(computeEngineSignal({ status: 'completed', ageHours: 2 }).status).toBe('operational');
  });
});

describe('computeAiNarrativeSignal (kept separate from the deterministic engine)', () => {
  it('reports operational with zero calls in the window', () => {
    expect(computeAiNarrativeSignal({ total: 0, failed: 0 }).status).toBe('operational');
  });

  it('reports operational for a healthy call volume', () => {
    expect(computeAiNarrativeSignal({ total: 50, failed: 1 }).status).toBe('operational');
  });

  it('SYNTHETIC FAILURE: reports degraded at an elevated failure rate', () => {
    expect(computeAiNarrativeSignal({ total: 20, failed: 4 }).status).toBe('degraded');
  });

  it('SYNTHETIC FAILURE: reports outage at a majority failure rate', () => {
    expect(computeAiNarrativeSignal({ total: 20, failed: 15 }).status).toBe('outage');
  });

  it('does not flag outage from a tiny sample even if all failed', () => {
    const signal = computeAiNarrativeSignal({ total: 2, failed: 2 });
    expect(signal.status).toBe('degraded');
    expect(signal.status).not.toBe('outage');
  });
});

describe('computeBillingSignal', () => {
  it('SYNTHETIC FAILURE: reports outage when most webhooks failed', () => {
    expect(computeBillingSignal({ total: 30, failedOrPending: 20 }).status).toBe('outage');
  });

  it('reports operational when webhooks are clean', () => {
    expect(computeBillingSignal({ total: 30, failedOrPending: 0 }).status).toBe('operational');
  });
});

describe('computeBenchmarksSignal', () => {
  it('SYNTHETIC FAILURE: reports outage when the benchmark table is empty', () => {
    expect(computeBenchmarksSignal({ rowCount: 0 }).status).toBe('outage');
  });

  it('reports operational with rows present', () => {
    expect(computeBenchmarksSignal({ rowCount: 97_500 }).status).toBe('operational');
  });
});

describe('computeReportGenerationSignal', () => {
  it('is honestly reported as unmonitored, not fabricated as operational', () => {
    const signal = computeReportGenerationSignal();
    expect(signal.status).toBe('unmonitored');
    expect(signal.detail).toMatch(/no server-side/i);
  });
});

describe('overallStatus', () => {
  it('ignores unmonitored components when computing the overall rollup', () => {
    const status = overallStatus([
      computeReportGenerationSignal(), // unmonitored
      computeDatabaseSignal({ ok: true, latencyMs: 20 }),
    ]);
    expect(status).toBe('operational');
  });

  it('SYNTHETIC FAILURE: a single outage among monitored components makes the overall status outage', () => {
    const status = overallStatus([
      computeDatabaseSignal({ ok: true, latencyMs: 20 }),
      computeAuthSignal({ ok: false, latencyMs: 20 }),
      computeBenchmarksSignal({ rowCount: 100 }),
    ]);
    expect(status).toBe('outage');
  });

  it('degraded outranks operational but not outage', () => {
    const status = overallStatus([
      computeDatabaseSignal({ ok: true, latencyMs: 2000 }), // degraded
      computeBenchmarksSignal({ rowCount: 100 }), // operational
    ]);
    expect(status).toBe('degraded');
  });
});
