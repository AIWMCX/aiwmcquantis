import { describe, it, expect } from 'vitest';
import {
  SAMPLE_REPORT,
  HEADLINE_METRICS,
  validateSampleReportIntegrity,
} from '@/data/sampleReport';

/**
 * These tests are the safety net for the landing hero's "Live sample" report.
 *
 * If any of them fail, the KPI cards above the preview no longer agree with
 * the rendered report pages — the user-facing data-integrity banner will fire,
 * and we should not ship.
 */
describe('validateSampleReportIntegrity()', () => {
  it('reports zero drift for the canonical sample report', () => {
    expect(validateSampleReportIntegrity()).toEqual([]);
  });

  it('headline metrics match the canonical SAMPLE_REPORT object exactly', () => {
    const byId = Object.fromEntries(HEADLINE_METRICS.map((m) => [m.id, m]));
    expect(byId.investment.value).toBe(SAMPLE_REPORT.metrics.investment.label);
    expect(byId.payback.value).toBe(SAMPLE_REPORT.metrics.paybackMonths.label);
    expect(byId.profit.value).toBe(SAMPLE_REPORT.metrics.monthlyProfitY2.label);
    expect(byId.status.value).toBe(SAMPLE_REPORT.meta.evidenceLabel);
  });

  it('page 3 KPI table echoes the canonical headline numbers', () => {
    const page3 = SAMPLE_REPORT.pages.find((p) => p.id === 3) as
      | { kpis?: ReadonlyArray<{ label: string; value: string }> }
      | undefined;
    expect(page3?.kpis).toBeDefined();
    const kvs = Object.fromEntries((page3!.kpis ?? []).map((k) => [k.label, k.value]));
    expect(kvs['Total investment required']).toBe(SAMPLE_REPORT.metrics.investment.label);
    expect(kvs['Payback period (base case)']).toBe(SAMPLE_REPORT.metrics.paybackMonths.label);
    expect(kvs['Monthly net profit (Y2)']).toBe(SAMPLE_REPORT.metrics.monthlyProfitY2.label);
  });

  it('validator flags drift if a headline card is mutated', () => {
    // Mutate a HEADLINE_METRICS entry in-place, run the validator, then restore.
    const original = HEADLINE_METRICS[0].value;
    (HEADLINE_METRICS[0] as { value: string }).value = '$999,999';
    try {
      const issues = validateSampleReportIntegrity();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.toLowerCase().includes('investment'))).toBe(true);
    } finally {
      (HEADLINE_METRICS[0] as { value: string }).value = original;
    }
    // Sanity: restoration must clear the drift.
    expect(validateSampleReportIntegrity()).toEqual([]);
  });

  it('cover/meta values shown to the buyer are stable strings (no undefined)', () => {
    expect(SAMPLE_REPORT.meta.company).toBeTruthy();
    expect(SAMPLE_REPORT.meta.location).toBeTruthy();
    expect(SAMPLE_REPORT.meta.generated).toBeTruthy();
    expect(SAMPLE_REPORT.meta.evidenceLabel).toBe('Fictional example');
    expect(SAMPLE_REPORT.meta.pages).toBe(SAMPLE_REPORT.pages.length);
  });

  it('keeps the illustrative gross margin and contribution LTV consistent with its displayed P&L', () => {
    const page5 = SAMPLE_REPORT.pages.find((p) => p.id === 5) as { kpis: ReadonlyArray<{ label: string; value: string }> };
    const page7 = SAMPLE_REPORT.pages.find((p) => p.id === 7) as { table: ReadonlyArray<readonly [string, string]> };
    const kpis = Object.fromEntries(page5.kpis.map((k) => [k.label, k.value]));
    const rows = Object.fromEntries(page7.table);
    const revenue = Number(rows['Total monthly revenue'].replace(/[^0-9.]/g, ''));
    const directCost = Number(rows['COGS (walk-in coffee/retail only)'].replace(/[^0-9.]/g, ''));
    const grossMargin = (revenue - directCost) / revenue;
    const ltv = Math.round(89 * 14 * grossMargin);

    expect(kpis['Gross margin']).toBe(`${Math.round(grossMargin * 100)}%`);
    expect(kpis['Contribution LTV (14-mo assumption)']).toBe(`$${ltv.toLocaleString('en-US')}`);
    expect(kpis['LTV : CAC']).toBe(`${(ltv / 42).toFixed(1)} ×`);
    expect(JSON.stringify(SAMPLE_REPORT)).not.toMatch(/79% confidence|multi-model cross-check/i);
  });

  it('every page has a non-empty title and a numeric id', () => {
    for (const p of SAMPLE_REPORT.pages) {
      expect(typeof p.id).toBe('number');
      expect(p.id).toBeGreaterThan(0);
      expect(p.title.trim().length).toBeGreaterThan(0);
      expect(p.kicker.trim().length).toBeGreaterThan(0);
    }
  });

  it('integrity validator surfaces page-3 KPI drift specifically', () => {
    // Simulate the page rendering an outdated KPI: temporarily monkey-patch a kpi label.
    const page3 = SAMPLE_REPORT.pages.find((p) => p.id === 3) as unknown as {
      kpis: Array<{ label: string; value: string }>;
    };
    const kpi = page3.kpis.find((k) => k.label === 'Total investment required')!;
    const original = kpi.value;
    kpi.value = '$0';
    try {
      const issues = validateSampleReportIntegrity();
      expect(issues.some((i) => i.includes('page 3 investment'))).toBe(true);
    } finally {
      kpi.value = original;
    }
  });
});
