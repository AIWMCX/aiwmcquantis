/**
 * Benchmark truth labels (2026-11-06).
 *
 * The Benchmark Master tables (migration 20260608000003) were generated from
 * an XLSX grid: every one of the 19,500 dimension combinations appears once
 * per table, and LTV:CAC p25 = 0.75 x p50 in 19,477 rows. They are modeled
 * reference ranges, not observed companies. Reports used to show them with
 * invented sample sizes ("n = 230", "n = 180"), as "Proprietary Industry
 * Benchmarks", as "Verified Benchmarks" and as "tied to the 97,500-row
 * library", and fallback marketing plans promised "3-4x return".
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildBenchmarkRecords,
  MODELED_REFERENCE_SOURCE,
} from '../../supabase/functions/analyze-business/benchmark-records';
import { MODELED_REFERENCE_LABEL, displayBenchmarkSource } from '@/lib/benchmark-citations';
import { compactCitation } from '@/services/benchmark-lookup';
import { buildBenchmarkCitationsSummary } from '@/hooks/pdf-benchmark-summary';
import { benchmarksToCsv } from '@/lib/benchmarksCsv';

const HONEST_LABEL = 'Quantis reference ranges (modeled, not observed data)';

const FULL_SUMMARY = {
  core: {
    match_quality: 'exact',
    gm_margin_p25: 0.4, gm_margin_p50: 0.55, gm_margin_p75: 0.7,
    op_margin_p50: 0.12, revenue_growth_yoy_p50: 0.1,
    rent_pct_rev_p50: 0.08, payroll_pct_rev_p50: 0.3, marketing_pct_rev_p50: 0.05,
  },
  unit_econ: {
    match_quality: 'region_level',
    cac_p25: 100, cac_p50: 150, cac_p75: 220,
    ltv_p25: 600, ltv_p50: 900, ltv_p75: 1400,
    ltv_cac_ratio_p25: 4.5, ltv_cac_ratio_p50: 6, ltv_cac_ratio_p75: 7.5,
    cac_payback_p25: 3, cac_payback_p50: 5, cac_payback_p75: 8,
    churn_monthly_p25: 0.02, churn_monthly_p50: 0.04, churn_monthly_p75: 0.06,
    retention_12m: 0.6, arpu_median: 80,
  },
  risk: { match_quality: 'exact', median_survival_years: 6 },
};

/** Code with comments removed, so the scan sees only what can reach a reader. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, '$1'))
    .join('\n');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === '__tests__' || name === 'integrations' || name === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function offenders(files: string[], patterns: RegExp[]): string[] {
  const hits: string[] = [];
  for (const f of files) {
    const code = stripComments(readFileSync(f, 'utf8'));
    for (const re of patterns) if (re.test(code)) hits.push(`${f} :: ${re}`);
  }
  return hits;
}

describe('benchmark records carry no invented sample sizes', () => {
  const records = buildBenchmarkRecords(FULL_SUMMARY as never, { gross_margin: 0.5, cac: 120 });

  it('every record has sample_size 0 (not a sample), even when percentiles matched', () => {
    expect(records.length).toBeGreaterThan(10);
    expect(records.some((r) => r.match_type !== 'none')).toBe(true);
    for (const r of records) expect(r.sample_size, r.metric).toBe(0);
  });

  it('the source says the ranges are modeled, with no row count and no "proprietary"', () => {
    for (const r of records.filter((x) => x.source !== null)) {
      expect(r.source).toBe(HONEST_LABEL);
      expect(r.source).not.toMatch(/rows|proprietary|\d{2},\d{3}/i);
    }
    expect(MODELED_REFERENCE_SOURCE).toBe(HONEST_LABEL);
    expect(MODELED_REFERENCE_LABEL).toBe(MODELED_REFERENCE_SOURCE);
  });
});

describe('renderers never print "n" for modeled ranges', () => {
  it('compact citation has no n= when there is no real count', () => {
    const text = compactCitation({ matched: true, metric: 'cac', p25: 1, p50: 2, p75: 3, source: 'X', dataDate: '2025-04-01' });
    expect(text).not.toMatch(/n=/);
  });

  it('CSV export has no sample_size column', () => {
    expect(benchmarksToCsv([]).split('\n')[0]).not.toContain('sample_size');
  });

  it('table and PDF renderers do not render sample_size / n=', () => {
    const files = [
      'src/components/analysis/BenchmarkRecordsBlock.tsx',
      'src/components/pdf/ReportBenchmarks.tsx',
      'src/components/analysis/BenchmarkCitations.tsx',
      'src/hooks/usePdfExport.ts',
    ];
    expect(offenders(files, [/\{r\.sample_size/, /\bn=\{/, /\bn=\$\{/, />n<\/th>/, /'Source · n · date'/])).toEqual([]);
  });

  it('stored legacy source labels are shown as modeled reference ranges', () => {
    expect(displayBenchmarkSource('AIWMC Quantis Benchmark Master (97,500 rows)')).toBe(HONEST_LABEL);
    expect(displayBenchmarkSource('AIWMC Quantis Benchmark Master')).toBe(HONEST_LABEL);
    expect(displayBenchmarkSource('Kerry Industry Dataset')).toBe(HONEST_LABEL);
    expect(displayBenchmarkSource(null)).toBe(HONEST_LABEL);
    expect(displayBenchmarkSource('XBRL 2024')).toBe('XBRL 2024');
  });

  it('the PDF citations summary promises no sample size and no row count', () => {
    const s = buildBenchmarkCitationsSummary([{ bench: { matched: true } }, { bench: { matched: false } }]);
    expect(s).toContain('This report matched 1 of 2 metrics');
    expect(s).toMatch(/modeled, not observed data/);
    expect(s).not.toMatch(/sample size|rows|97,500/i);
  });
});

describe('customer-facing code makes no proprietary / verified / row-count benchmark claims', () => {
  it('src/ (excluding tests, comments and generated types)', () => {
    const patterns = [
      /Proprietary Industry Benchmark/i,
      /proprietary (industry )?(benchmark|database)/i,
      /\(proprietary( benchmarks)?\)/i,
      /97,500-row/,
      /Verified Benchmarks/,
      /verified (proprietary )?(industry )?benchmarks/i,
      /real business metrics/i,
      /n=97,500/,
      /47\+ industry datasets/,
      /Benchmark Master \(\d/,
      /real benchmark dataset/i,
    ];
    expect(offenders(walk('src'), patterns)).toEqual([]);
  });

  it('supabase/functions (excluding tests): no "verified proprietary", no "company sample", no default ROI multiples', () => {
    const files = walk('supabase/functions');
    const patterns = [
      /verified proprietary/i,
      /proprietary benchmark database/i,
      /company sample/i,
      /expected_roi"?\s*:\s*["'`][^"'`\n]*\d\s*x\b/,
      /Expected positive return/,
      /observations from public, licensed, and proprietary datasets/,
    ];
    expect(offenders(files, patterns)).toEqual([]);
  });
});
